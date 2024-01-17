import {
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Divider,
  InputAdornment,
  TextField,
  Grid,
  Button,
  CircularProgress
} from "@suid/material"
import { Config as Conn } from '../../backend/models/connections'
import { createSignal, onCleanup } from "solid-js"
import { FwFace } from "@ndn/fw"
import * as ndncert from '@ndn/ndncert'
import * as keychain from "@ndn/keychain"
import { TestbedAnchorName } from "../../constants"
import { bytesToBase64 } from "../../utils"
import { Encoder } from "@ndn/tlv"
import { WsTransport } from "@ndn/ws-transport"
import { Endpoint } from "@ndn/endpoint"
import { fchQuery } from "@ndn/autoconfig"

type Resolver = { resolve: (pin: string | PromiseLike<string>) => void }

export default function NdnTestbed(props: {
  onAdd: (config: Conn) => void
}) {
  const [host, setHost] = createSignal('')
  const [email, setEmail] = createSignal('')
  const [pin, setPin] = createSignal('')
  const [tempFace, setTempFace] = createSignal<FwFace>()
  const wsUri = () => `wss://${host()}/ws/`
  // const [keyPair, setKeyPair] = createSignal<KeyPair>()
  const [pinResolver, setPinResolver] = createSignal<Resolver>()
  const [isRequesting, setIsRequesting] = createSignal(false)

  const onFch = async () => {
    try {
      const fchRes = await fchQuery({
        transport: 'wss',
        network: "ndn",
      })
      if (fchRes.routers.length > 0) {
        const url = new URL(fchRes.routers[0].connect)
        setHost(url.host)
      }
    } catch {
      console.error('FCH server is down.')
    }
  }

  const onInputPin = () => {
    const resolve = pinResolver()?.resolve
    if (resolve !== undefined && pin() !== '') {
      resolve(pin())
    }
  }

  const onRequest = async () => {
    setIsRequesting(true)
    try {
      const curEmail = email()
      const curUri = wsUri()

      // Set connection
      if (tempFace() === undefined) {
        const nfdWsFace = await WsTransport.createFace({ l3: { local: false } }, curUri)
        setTempFace(nfdWsFace)
      }

      let caProfile: ndncert.CaProfile | undefined = undefined
      let caFullName = TestbedAnchorName
      let probeRes
      while (caProfile === undefined) {
        // Request profile
        caProfile = await ndncert.retrieveCaProfile({
          caCertFullName: caFullName,
        })
        // Probe step
        probeRes = await ndncert.requestProbe({
          profile: caProfile,
          parameters: { email: new TextEncoder().encode(curEmail) },
        })
        if (probeRes.entries.length <= 0) {
          console.error('No available name to register')
          return
        }
        if (probeRes.redirects.length > 0) {
          caFullName = probeRes.redirects[0].caCertFullName
          caProfile = undefined
        }
      }
      // Generate key pair
      const myPrefix = probeRes!.entries[0].prefix
      const keyName = keychain.CertNaming.makeKeyName(myPrefix)
      const algo = keychain.ECDSA
      const gen = await keychain.ECDSA.cryptoGenerate({}, true)
      const prvKey = keychain.createSigner(keyName, algo, gen)
      const pubKey = keychain.createVerifier(keyName, algo, gen)
      const prvKeyBits = await crypto.subtle.exportKey('pkcs8', gen.privateKey)
      // Minus one to avoid the failure when the clock is not synced.
      const maximalValidityDays = Math.floor(caProfile.maxValidityPeriod / 86400000) - 1

      // New step
      const cert = await ndncert.requestCertificate({
        endpoint: new Endpoint({
          retx: {
            limit: 4,
            interval: 5000,
          }
        }),
        profile: caProfile,
        privateKey: prvKey,
        publicKey: pubKey,
        validity: keychain.ValidityPeriod.daysFromNow(maximalValidityDays),
        challenges: [
          new ndncert.ClientEmailChallenge(curEmail, () => {
            return new Promise(resolve => {
              setIsRequesting(false);
              setPinResolver({ resolve })
            })
          })
        ],
      })

      // Finish
      setPinResolver(undefined)
      const certB64 = bytesToBase64(Encoder.encode(cert.data))
      // Note: due to time constraint we are not able to add a persistent TPM/Keychain to the implementation.
      // So we have to compromise and save the key bits
      const prvKeyB64 = bytesToBase64(new Uint8Array(prvKeyBits))
      props.onAdd({
        kind: 'nfdWs',
        uri: curUri,
        isLocal: false,
        ownCertificateB64: certB64,
        prvKeyB64: prvKeyB64,
      })
    } catch (e) {
      console.error('Failed to request certificate:', e)
    }
  }

  onCleanup(() => {
    const wsFace = tempFace()
    const curResolver = pinResolver()
    if (curResolver !== undefined) {
      curResolver.resolve('')
    }
    if (wsFace !== undefined) {
      wsFace.close()
    }
  })

  return <Card>
    <CardHeader
      sx={{ textAlign: 'left' }}
      title="NDN Testbed with NDNCert Bootstrapping"
    />
    <Divider />
    <CardContent>
      <Grid container spacing={1} alignItems='center'>
        <Grid item xs={8}>
          <TextField
            fullWidth
            label="Closest Testbed Node"
            name="uri"
            type="text"
            InputProps={{
              startAdornment:
                <InputAdornment position="start">
                  wss://
                </InputAdornment>,
              endAdornment:
                <InputAdornment position="start">
                  /ws/
                </InputAdornment>,
            }}
            value={host()}
            onChange={event => setHost(event.target.value)}
          />
        </Grid>
        <Grid item xs={4}>
          <Button variant="text" color="primary" onClick={onFch}>
            Reach Testbed
          </Button>
        </Grid>
        <Grid item xs={8}>
          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={email()}
            onChange={event => setEmail(event.target.value)}
            disabled={host() === ''}
          />
        </Grid>
        <Grid item xs={4}>
          {isRequesting() ? <CircularProgress /> : <Button variant="text" color="primary"
            onClick={onRequest}
            disabled={host() === '' || email() === '' || pinResolver() !== undefined}>
            Request
          </Button>}
        </Grid>
        <Grid item xs={8}>
          <TextField
            fullWidth
            label="Pin"
            name="pin"
            type="text"
            value={pin()}
            onChange={event => setPin(event.target.value)}
            disabled={pinResolver() === undefined}
          />
        </Grid>
        <Grid item xs={4}>
          <Button variant="text" color="primary" onClick={onInputPin} disabled={pinResolver() === undefined}>
            Get Cert
          </Button>
        </Grid>
      </Grid>
    </CardContent>
    <Divider />
    <CardActions sx={{ justifyContent: 'flex-end' }}>
      <Button
        variant="text"
        color="primary"
        disabled
      >
        AUTO SAVE WHEN DONE
      </Button>
    </CardActions>
  </Card>
}
