import { Button, Card, CardContent, CardHeader, Divider, Stack, Typography } from "@suid/material"
import * as main from "../../backend/main"
import { createSignal } from "solid-js"
import { digestSigning } from "@ndn/packet"
import * as ndncert from '@ndn/ndncert'
import * as keychain from "@ndn/keychain"
import { WorkspaceAnchorName } from "../../constants"
import { useNavigate } from "@solidjs/router"
import { useNdnWorkspace } from "../../Context"

export default function Hackathon() {
  const [disabled, setDisabled] = createSignal(false)
  const navigate = useNavigate()
  const { bootstrapWorkspace, } = useNdnWorkspace()!

  const run = async (init: boolean) => {
    setDisabled(true)
    if (main.nfdWsFace === undefined) {
      console.error('Not connected to the testbed.')
      return
    }
    const pofp = main.nfdCertificate
    const signer = main.nfdCmdSigner
    if (pofp === undefined || signer === digestSigning) {
      console.debug(pofp?.name?.toString())
      console.error('Please make sure you are using a valid certificate.')
      return
    }

    // Request profile
    const caProfile = await ndncert.retrieveCaProfile({
      caCertFullName: WorkspaceAnchorName,
    })

    // New identity name (node id)
    // add a random number to prevent reusing the same identity over multiple devices
    const appPrefix = WorkspaceAnchorName.getPrefix(WorkspaceAnchorName.length - 5)
    const testbedName = pofp.name.at(pofp.name.length - 5).text
    const username = testbedName + '-' + Math.floor(Math.random() * 256).toString()
    const nodeId = appPrefix.append(username)

    // Generate key pair
    const keyName = keychain.CertNaming.makeKeyName(nodeId)
    const algo = keychain.ECDSA
    const gen = await keychain.ECDSA.cryptoGenerate({}, true)
    const prvKey = keychain.createSigner(keyName, algo, gen)
    const pubKey = keychain.createVerifier(keyName, algo, gen)
    const prvKeyBits = await crypto.subtle.exportKey('pkcs8', gen.privateKey)
      // Minus one to avoid the failure when the clock is not synced.
    const maximalValidityDays = Math.floor(caProfile.maxValidityPeriod / 86400000) - 1

    // New step
    const cert = await ndncert.requestCertificate({
      profile: caProfile,
      privateKey: prvKey,
      publicKey: pubKey,
      validity: keychain.ValidityPeriod.daysFromNow(maximalValidityDays),
      challenges: [
        new ndncert.ClientPossessionChallenge(pofp, signer)
      ],
    })

    try {
      await bootstrapWorkspace({
        createNew: init,
        trustAnchor: caProfile.cert,
        ownCertificate: cert,
        prvKey: new Uint8Array(prvKeyBits),
      })
      console.log('Successfully bootstrapped.')
      navigate('/profile', { replace: true })
    } catch (error) {
      console.log(`Unable to bootstrap workspace: ${error}`)
    }
  }

  return <Card>
    <CardHeader
      sx={{ textAlign: 'left' }}
      title="15th Hackathon Special Bootstrap"
      subheader={
        <Typography color="primary" fontFamily='"Roboto Mono", ui-monospace, monospace'>
          /ndn/multicast/workspace-test
        </Typography>
      } />
    <Divider />
    <CardContent>
      This page will boostrap you into the workspace of the 15th NDN hackathon demo using proof-of-possession.
      Please click the following button after you connect to the testbed with a valid certificate.
    </CardContent>
    <Divider />
    <CardContent>
      <Stack direction="row" spacing={2} justifyContent='flex-end'>
        <Button variant="outlined" onClick={() => run(true)} color='secondary' disabled={disabled()}>
          CREATE
        </Button>
        <Button variant="outlined" onClick={() => run(false)} color='primary' disabled={disabled()}>
          JOIN
        </Button>
      </Stack>
    </CardContent>
  </Card >
}
