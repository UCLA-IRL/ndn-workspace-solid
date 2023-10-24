import { Encoder, Decoder } from "@ndn/tlv"
import { Name, Data, Verifier, Signer } from "@ndn/packet"
import {
  Certificate, createVerifier, NamedVerifier, createSigner, ECDSA
} from "@ndn/keychain"
import { Storage } from "../sync-agent"
import { Endpoint } from "@ndn/endpoint"

export class CertStorage {
  private _signer: Signer | undefined
  private pubKey: NamedVerifier<true> | undefined
  readonly readyEvent: Promise<void>

  constructor(
    readonly trustAnchor: Certificate,
    readonly ownCertificate: Certificate,
    readonly storage: Storage,
    readonly endpoint: Endpoint,
    prvKeyBits: Uint8Array
  ) {
    this.readyEvent = (async () => {
      await this.importCert(trustAnchor)
      await this.importCert(ownCertificate)
      const keyPair = await ECDSA.cryptoGenerate({
        importPkcs8: [prvKeyBits, ownCertificate.publicKeySpki]
      }, true)
      this._signer = createSigner(
        ownCertificate.name.getPrefix(ownCertificate.name.length - 2),
        ECDSA,
        keyPair).withKeyLocator(ownCertificate.name)
    })()
  }
 
  get signer() {
    return this._signer
  }

  get certificate() {
    return this.ownCertificate
  }

  async importCert(cert: Certificate) {
    const encoder = new Encoder
    cert.data.encodeTo(encoder)
    await this.storage.put(cert.name.toString(), encoder.output)
  }

  async getCertificate(keyName: Name, localOnly: boolean): Promise<Certificate | undefined> {
    const certBytes = await this.storage.get(keyName.toString())
    if (certBytes === undefined) {
      if (localOnly) {
        return undefined
      } else {
        try {
          const result = await this.endpoint.consume(keyName, {
            // Fetched key must be signed by a known key
            // TODO: Find a better way to handle security
            verifier: this.localVerifier,
            // retx: 3
          })
          return Certificate.fromData(result)
        } catch {
          return undefined
        }
      }
    } else {
      const decoder = new Decoder(certBytes)
      return Certificate.fromData(Data.decodeFrom(decoder))
    }
  }

  async verify(pkt: Verifier.Verifiable, localOnly: boolean) {
    const keyName = pkt.sigInfo?.keyLocator?.name
    if (!keyName) {
      throw new Error(`Data not signed: ${pkt.name.toString()}`)
    }
    const cert = await this.getCertificate(keyName, localOnly)
    if (cert === undefined) {
      throw new Error(`No certificate: ${pkt.name.toString()} signed by ${keyName.toString()}`)
    }
    const verifier = await createVerifier(cert, { algoList: [ECDSA] })
    try {
      await verifier.verify(pkt)
    } catch (error) {
      throw new Error(`Unable to verify ${pkt.name.toString()} signed by ${keyName.toString()} due to: ${error}`)
    }
  }

  get verifier(): Verifier {
    return {
      verify: pkt => this.verify(pkt, false)
    }
  }

  get localVerifier(): Verifier {
    return {
      verify: pkt => this.verify(pkt, true)
    }
  }
}
