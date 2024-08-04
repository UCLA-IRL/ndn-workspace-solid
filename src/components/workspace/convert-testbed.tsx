import { Button, Card, CardContent, CardHeader, Divider, Stack, TextField } from '@suid/material'
import * as main from '../../backend/main'
import { createSignal } from 'solid-js'
import { digestSigning } from '@ndn/packet'
import * as ndncert from '@ndn/ndncert'
import * as keychain from '@ndn/keychain'
import { useNavigate } from '@solidjs/router'
import { useNdnWorkspace } from '../../Context'
import { AltUri } from '@ndn/naming-convention2'
import { ValidityPeriod } from '@ndn/packet'
import toast from 'solid-toast'

export default function ConvertTestbed() {
  const [disabled, setDisabled] = createSignal(false)
  const [anchorNameStr, setAnchorNameStr] = createSignal('')
  const navigate = useNavigate()
  const { bootstrapWorkspace } = useNdnWorkspace()!
  const [errorText, setErrorText] = createSignal('')

  const run = async () => {
    setDisabled(true)
    if (main.connection === undefined) {
      console.error('Not connected to the testbed.')
      toast.error('Not connected to the testbed.')
      return
    }
    const pofp = main.connection.nfdCert
    const signer = main.connection.cmdSigner
    if (pofp === undefined || signer === undefined || signer === digestSigning) {
      console.debug(pofp?.name?.toString())
      console.error('Please make sure you are using a valid certificate.')
      toast.error('Testbed certificate is not being used now. Please make sure you are using a valid certificate.')
      return
    }
    const workspaceAnchorName = AltUri.parseName(anchorNameStr())

    // Request profile
    let caProfile
    try {
      caProfile = await ndncert.retrieveCaProfile({
        caCertFullName: workspaceAnchorName,
      })
    } catch {
      setErrorText('Not valid CA cert full name')
      toast.error('CA certificate full name is not valid. Please check again.')
      return
    }

    // New identity name (node id)
    // add a random number to prevent reusing the same identity over multiple devices
    const appPrefix = workspaceAnchorName.getPrefix(workspaceAnchorName.length - 5)
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
      validity: ValidityPeriod.daysFromNow(maximalValidityDays),
      challenges: [new ndncert.ClientPossessionChallenge(pofp, signer)],
    })

    try {
      await bootstrapWorkspace({
        // createNew: init,
        trustAnchor: caProfile.cert,
        ownCertificate: cert,
        prvKey: new Uint8Array(prvKeyBits),
      })
      console.log('Successfully bootstrapped.')
      toast.success('Successfully bootstrapped.')
      navigate('/profile', { replace: true })
    } catch (error) {
      console.log(`Unable to bootstrap workspace: ${error}`)
      toast.error(`Unable to bootstrap workspace: ${error}`)
    }
  }

  return (
    <Card>
      <CardHeader sx={{ textAlign: 'left' }} title="Convert Testbed Cert as Workspace Identity" />
      <Divider />
      <CardContent>
        This is designed for Workspace instances which have CAs reachable through testbed. Please refer to home page on
        how to join normal Workspace instances. This page will let you convert a testbed certificate into a workspace
        certificate using proof-of-possession. Please connect to the testbed with a valid certificate and provide the
        full name of the trust anchor.
      </CardContent>
      <Divider />
      <CardContent>
        <TextField
          fullWidth
          label="Trust Anchor Full Name"
          name="trust-anchor"
          type="text"
          value={anchorNameStr()}
          onChange={(event) => {
            setDisabled(false) // re-activate the button
            setErrorText('') // clean error text
            setAnchorNameStr(event.target.value)
          }}
          helperText={errorText()}
          error={errorText() !== ''}
        />
      </CardContent>
      <Divider />
      <CardContent>
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            variant="outlined"
            onClick={() => run()}
            color="primary"
            disabled={disabled() || anchorNameStr() === ''}
          >
            JOIN
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}
