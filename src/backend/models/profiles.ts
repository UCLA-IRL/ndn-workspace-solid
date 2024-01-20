import { Certificate } from '@ndn/keychain'
import { base64ToBytes, bytesToBase64 } from '../../utils'
import { Decoder, Encoder } from '@ndn/tlv'
import { Data } from '@ndn/packet'
import { TypedModel } from './typed-models'

export type Profile = {
  workspaceName: string
  nodeId: string
  trustAnchorB64: string
  prvKeyB64: string
  ownCertificateB64: string
}

export const profiles = new TypedModel<Profile>('profiles', (profile) => profile.nodeId)

export function toBootParams(profile: Profile) {
  const prvKey = base64ToBytes(profile.prvKeyB64)
  const anchorBytes = base64ToBytes(profile.trustAnchorB64)
  const trustAnchor = Certificate.fromData(Decoder.decode(anchorBytes, Data))
  const certBytes = base64ToBytes(profile.ownCertificateB64)
  const ownCertificate = Certificate.fromData(Decoder.decode(certBytes, Data))
  return {
    trustAnchor,
    prvKey,
    ownCertificate,
  }
}

export function fromBootParams(params: {
  trustAnchor: Certificate
  prvKey: Uint8Array
  ownCertificate: Certificate
}): Profile {
  const certWire = Encoder.encode(params.ownCertificate.data)
  const certB64 = bytesToBase64(certWire)

  const anchorWire = Encoder.encode(params.trustAnchor.data)
  const anchorB64 = bytesToBase64(anchorWire)

  const prvKeyB64 = bytesToBase64(params.prvKey)

  const nodeId = params.ownCertificate.name.getPrefix(params.ownCertificate.name.length - 4)
  const appPrefix = params.trustAnchor.name.getPrefix(params.trustAnchor.name.length - 4)

  return {
    workspaceName: appPrefix.toString(),
    nodeId: nodeId.toString(),
    trustAnchorB64: anchorB64,
    prvKeyB64: prvKeyB64,
    ownCertificateB64: certB64,
  }
}
