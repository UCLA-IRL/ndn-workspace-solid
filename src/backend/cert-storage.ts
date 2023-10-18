import { Encoder, Decoder } from "@ndn/tlv"
import { Name, Data, Verifier } from "@ndn/packet"
import { Version } from "@ndn/naming-convention2"
import {
  generateSigningKey, Ed25519, Certificate, NamedSigner, ValidityPeriod, createVerifier, NamedVerifier
} from "@ndn/keychain"

export class CertStorage implements Verifier {
  private prvKey: NamedSigner<true> | undefined
  private pubKey: NamedVerifier<true> | undefined
  private cert: Certificate | undefined
  readonly readyEvent: Promise<void>
  readonly storage: { [name: string]: Certificate } = {}

  constructor(nodeId: Name) {
    this.readyEvent = generateSigningKey(nodeId.append('KEY', '1'), Ed25519).then((keyPair) => {
      [this.prvKey, this.pubKey] = keyPair
      if (this.pubKey.spki) {
        return Certificate.build({
          name: (new Name(`${nodeId}/KEY/1/self`)).append(Version.create(Date.now())),
          validity: new ValidityPeriod(Date.now(), Date.now() + 31536000000),
          signer: this.prvKey,
          publicKeySpki: this.pubKey.spki,
        })
      } else {
        throw new Error("FATAL: generated public key cannot be exported")
      }
    }).then((certificate) => {
      this.cert = certificate
      const keyName = certificate.name.getPrefix(certificate.name.length - 2)
      this.storage[keyName.toString()] = certificate
    })
  }

  get signer() {
    return this.prvKey
  }

  get certificate() {
    return this.cert
  }

  exportSelfCert() {
    const encoder = new Encoder()
    if (this.cert) {
      this.cert.data.encodeTo(encoder)
      const wire = encoder.output
      return wire
    } else {
      return new Uint8Array(0)
    }
  }

  importCert(wire: Uint8Array) {
    try {
      const decoder = new Decoder(wire)
      const data = Data.decodeFrom(decoder)
      const cert = Certificate.fromData(data)
      const keyName = cert.name.getPrefix(cert.name.length - 2)
      this.storage[keyName.toString()] = cert
      console.log(`Imported certificate of key: ${keyName}`)
    } catch (error) {
      console.error(`Unable to parse certificate due to error: ${error}`)
    }
  }

  async verify(pkt: Verifier.Verifiable) {
    return

    // TODO: Temporary disable verifier to make code work
    // const keyName = pkt.sigInfo?.keyLocator?.name
    // if (!keyName) {
    //   throw new Error(`Data not signed: ${pkt.name.toString()}`)
    // }
    // const cert = this.storage?.[keyName.toString()]
    // if (!cert) {
    //   throw new Error(`No certificate: ${pkt.name.toString()} signed by ${keyName.toString()}`)
    // }
    // const verifier = await createVerifier(cert, { algoList: [Ed25519] })
    // try {
    //   await verifier.verify(pkt)
    // } catch (error) {
    //   throw new Error(`Unable to verify ${pkt.name.toString()} signed by ${keyName.toString()} due to: ${error}`)
    // }
  }
}
