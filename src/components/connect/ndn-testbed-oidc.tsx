import { Card, CardActions, CardContent, CardHeader, Divider, Button, Stack } from '@suid/material'
import { Config as Conn } from '../../backend/models/connections'
import { createSignal, createUniqueId, onCleanup } from 'solid-js'
import { FwFace } from '@ndn/fw'
import * as ndncert from '@ndn/ndncert'
import * as keychain from '@ndn/keychain'
import {
  GitHubOAuthClientId,
  GitHubOIDCChallengeId,
  GoogleOAuthClientId,
  GoogleOIDCChallengeId,
  TestbedOidcAnchorPrefix,
} from '../../constants'
import { bytesToBase64 } from '../../utils'
import { Encoder } from '@ndn/tlv'
import { WsTransport } from '@ndn/ws-transport'
import { Endpoint } from '@ndn/endpoint'
import { fchQuery } from '@ndn/autoconfig'
import { ClientOidcChallenge } from '@ucla-irl/ndnts-aux/adaptors'
import { Name } from '@ndn/packet'
import toast from 'solid-toast'

export default function NdnTestbedOidc(props: { onAdd: (config: Conn) => void }) {
  // const { endpoint } = useNdnWorkspace()!
  const [tempFace, setTempFace] = createSignal<FwFace>()

  const [requestId, setRequestId] = createSignal('')
  const [oidcId, setOidcId] = createSignal('')
  const [chalId, setChalId] = createSignal('')
  // Official way should be useLocation, but I don't think we need it if we only uses the origin
  const basePath = location.origin // === `${location.protocol}//${location.host}`
  const redirectTarget = `${basePath}/oidc-redirected.html`
  const channel = new BroadcastChannel('oauth-test')

  onCleanup(() => {
    channel.close()
  })

  channel.addEventListener('message', (event) => {
    const data = event.data
    if (data.state === requestId()) {
      console.debug(`Access code: ${data.code}`)
      onRequest(data.code, chalId(), oidcId())
    } else {
      console.error(`Unknown redirection: ${data.state}`)
    }
  })

  const fch = async () => {
    try {
      const fchRes = await fchQuery({
        transport: 'wss',
        network: 'ndn',
      })
      if (fchRes.routers.length > 0) {
        const url = new URL(fchRes.routers[0].connect)
        return `wss://${url.host}/ws/`
      } else {
        throw new Error('No router found.')
      }
    } catch (e) {
      console.error(`FCH server is down: ${e}`)
      throw e
    }
  }

  const onRequest = async (accessCode: string, challengeId: string, oidcId: string) => {
    try {
      const fchUri = await fch()

      // Set connection
      if (tempFace() === undefined) {
        const nfdWsFace = await WsTransport.createFace({ l3: { local: false } }, fchUri)
        setTempFace(nfdWsFace)
      }

      // This is the current work-around for some technical issue on the CA side.
      // It is not secure and is supposed to change in future.
      // const caProfileUnsafe = async (caPrefix: Name) => {
      //   const metadata = await retrieveMetadata(caPrefix.append("CA", "INFO"), { endpoint })
      //   const profileData = await endpoint.consume(new Interest(metadata.name.append(Segment, 0)))
      //   return await ndncert.CaProfile.fromData(profileData)
      // }
      const caProfile = await ndncert.retrieveCaProfile({
        caCertFullName: TestbedOidcAnchorPrefix,
      })
      // Generate key pair
      const myPrefix = new Name('/ndn/to-be-assigned')
      const keyName = keychain.CertNaming.makeKeyName(myPrefix)
      const algo = keychain.ECDSA
      const gen = await keychain.ECDSA.cryptoGenerate({}, true)
      const prvKey = keychain.createSigner(keyName, algo, gen)
      const pubKey = keychain.createVerifier(keyName, algo, gen)
      const prvKeyBits = await crypto.subtle.exportKey('pkcs8', gen.privateKey)
      // Minus one to avoid the failure when the clock is not synced.
      const maximalValidityDays = Math.floor(caProfile.maxValidityPeriod / 86400000) - 1

      // New step
      const redirectUri = redirectTarget
      const cert = await ndncert.requestCertificate({
        endpoint: new Endpoint({
          retx: {
            limit: 4,
            interval: 5000,
          },
        }),
        profile: caProfile,
        privateKey: prvKey,
        publicKey: pubKey,
        validity: keychain.ValidityPeriod.daysFromNow(maximalValidityDays),
        challenges: [
          new ClientOidcChallenge(challengeId, {
            oidcId,
            accessCode,
            redirectUri,
          }),
        ],
      })

      // Finish
      const certB64 = bytesToBase64(Encoder.encode(cert.data))
      // Note: due to time constraint we are not able to add a persistent TPM/Keychain to the implementation.
      // So we have to compromise and save the key bits
      const prvKeyB64 = bytesToBase64(new Uint8Array(prvKeyBits))
      props.onAdd({
        kind: 'nfdWs',
        uri: fchUri,
        isLocal: false,
        ownCertificateB64: certB64,
        prvKeyB64: prvKeyB64,
      })
    } catch (e) {
      console.error('Failed to request certificate:', e)
      toast.error(`Failed to request certificate: ${e}`)
    }
  }

  onCleanup(() => {
    const wsFace = tempFace()
    if (wsFace !== undefined) {
      wsFace.close()
    }
  })

  const onClickGoogle = () => {
    setRequestId(createUniqueId())
    const queryStr = new URLSearchParams({
      scope: 'openid https://www.googleapis.com/auth/userinfo.email',
      redirect_uri: redirectTarget,
      response_type: 'code',
      client_id: GoogleOAuthClientId,
      state: requestId(),
      access_type: 'offline',
    }).toString()
    setOidcId(GoogleOAuthClientId)
    setChalId(GoogleOIDCChallengeId)
    const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + queryStr
    window.open(url) // TODO: not working on Safari
  }

  const onClickGithub = () => {
    setRequestId(createUniqueId())
    const queryStr = new URLSearchParams({
      scope: 'openid user:email',
      redirect_uri: redirectTarget,
      client_id: GitHubOAuthClientId,
      state: requestId(),
    }).toString()
    setOidcId(GitHubOAuthClientId)
    setChalId(GitHubOIDCChallengeId)
    const url = 'https://github.com/login/oauth/authorize?' + queryStr
    window.open(url) // TODO: not working on Safari
  }

  return (
    <Card>
      <CardHeader
        sx={{ textAlign: 'left' }}
        title="NDN Testbed with OIDC"
        subheader="The URI will be result from FCH to the testbed"
      />
      <Divider />
      <CardContent>
        <Stack direction="column" spacing={2}>
          <Button onClick={onClickGoogle} variant="outlined" color="secondary" disabled={requestId() !== ''}>
            Google
          </Button>
          <Button onClick={onClickGithub} variant="outlined" color="secondary" disabled={requestId() !== ''}>
            GitHub
          </Button>
        </Stack>
      </CardContent>
      <Divider />
      <CardActions sx={{ justifyContent: 'flex-end' }}>
        <Button variant="text" color="primary" disabled>
          AUTO SAVE WHEN DONE
        </Button>
      </CardActions>
    </Card>
  )
}
