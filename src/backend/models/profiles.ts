import { Certificate } from "@ndn/keychain"
import { base64ToBytes, bytesToBase64 } from "../../utils"
import { Decoder, Encoder } from "@ndn/tlv"
import { Data } from "@ndn/packet"
import { TypedModel } from "./typed-models"

export type Profile = {
  workspaceName: string
  nodeId: string
  trustAnchorB64: string
  prvKeyB64: string
  ownCertificateB64: string
}

export const profiles = new TypedModel<Profile>('profiles', profile => profile.nodeId)

export function toBootParams(profile: Profile) {
  const prvKey = base64ToBytes(profile.prvKeyB64)
  const anchorBytes = base64ToBytes(profile.trustAnchorB64)
  const anchorDecoder = new Decoder(anchorBytes)
  const trustAnchor = Certificate.fromData(Data.decodeFrom(anchorDecoder))
  const certBytes = base64ToBytes(profile.ownCertificateB64)
  const certDecoder = new Decoder(certBytes)
  const ownCertificate = Certificate.fromData(Data.decodeFrom(certDecoder))
  return {
    trustAnchor,
    prvKey,
    ownCertificate,
  }
}

export function fromBootParams(params: {
  trustAnchor: Certificate,
  prvKey: Uint8Array,
  ownCertificate: Certificate,
}): Profile {
  const certEncoder = new Encoder()
  params.ownCertificate.data.encodeTo(certEncoder)
  const certB64 = bytesToBase64(certEncoder.output)

  const anchorEncoder = new Encoder()
  params.trustAnchor.data.encodeTo(anchorEncoder)
  const anchorB64 = bytesToBase64(anchorEncoder.output)

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
