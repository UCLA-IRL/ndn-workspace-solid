import { Encoder, Decoder } from "@ndn/tlv"
import { Name, Data, Verifier, Signer } from "@ndn/packet"
import {
  Certificate, createVerifier, createSigner, ECDSA
} from "@ndn/keychain"
import { Storage } from "../storage"
import { Endpoint } from "@ndn/endpoint"

/**
 * A Signer & Verifier that handles security authentication.
 * CertStorage itself is not a storage, actually. Depend on an external storage.
 */
export class CertStorage {
  private _signer: Signer | undefined
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

  /** Obtain the signer */
  get signer() {
    return this._signer
  }

  /** Obtain this node's own certificate */
  get certificate() {
    return this.ownCertificate
  }

  /** Import an external certificate into the storage */
  async importCert(cert: Certificate) {
    await this.storage.set(cert.name.toString(), Encoder.encode(cert.data))
  }

  /**
   * Fetch a certificate based on its name from local storage and then remote.
   * @param keyName The certificate's name.
   * @param localOnly If `true`, only look up the local storage without sending an Interest.
   * @returns The fetched certificate. `undefined` if not found.
   */
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
            modifyInterest: { mustBeFresh: true, lifetime: 5000 },
            retx: 5,
          })

          // Cache result certificates
          this.storage.set(result.name.toString(), Encoder.encode(result))

          return Certificate.fromData(result)
        } catch {
          return undefined
        }
      }
    } else {
      return Certificate.fromData(Decoder.decode(certBytes, Data))
    }
  }

  /**
   * Verify a packet. Throw an error if failed.
   * @param pkt The packet to verify.
   * @param localOnly If `true`, only look up the local storage for the certificate.
   */
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

  /** Obtain an verifier that fetches certificate */
  get verifier(): Verifier {
    return {
      verify: pkt => this.verify(pkt, false)
    }
  }

  /** Obtain an verifier that does not fetch certificate remotely */
  get localVerifier(): Verifier {
    return {
      verify: pkt => this.verify(pkt, true)
    }
  }

  async create(
    trustAnchor: Certificate,
    ownCertificate: Certificate,
    storage: Storage,
    endpoint: Endpoint,
    prvKeyBits: Uint8Array
  ) {
    const result = new CertStorage(
      trustAnchor, ownCertificate, storage, endpoint, prvKeyBits
    )
    await result.readyEvent
    return result
  }
}
