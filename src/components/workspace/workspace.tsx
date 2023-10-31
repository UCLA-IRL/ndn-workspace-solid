import { Button, Stack } from "@suid/material"
import { Match, Switch, createEffect, createSignal } from "solid-js"
import AppNamespace from "./app-namespace"
import BootSafebag from "./boot-safebag"
import { useNdnWorkspace } from "../../Context"
import { Certificate, ECDSA, createVerifier } from "@ndn/keychain"
import OwnCertificate from "./own-certificate"
import { useNavigate } from "@solidjs/router"

export default function Workspace() {
  const {
    booted,
    bootstrapWorkspace,
    stopWorkspace,
    trustAnchor: initAnchor,
    ownCertificate: initCertificate,
  } = useNdnWorkspace()!
  const [trustAnchor, setTrustAnchor] = createSignal<Certificate | undefined>(initAnchor())
  const [certificate, setCertificate] = createSignal<Certificate | undefined>(initCertificate())
  const [prvKeyBytes, setPrvKeyBytes] = createSignal<Uint8Array>(new Uint8Array())
  const [readyToStart, setReadyToStart] = createSignal(false)
  const [inProgress, setInProgress] = createSignal(false)
  const navigate = useNavigate()

  createEffect(() => {
    const prvKeyBits = prvKeyBytes()
    const cert = certificate()
    const anchor = trustAnchor()
    if (!booted() && prvKeyBits.length > 0 && cert !== undefined && anchor !== undefined) {
      // All values are set
      // Still need to check the signature and issuer name of the certificate, but after the button is clicked
      setReadyToStart(true)
    } else {
      setReadyToStart(false)
    }
  })

  const onBootrstap = (init: boolean) => {
    setInProgress(true)
    const prvKeyBits = prvKeyBytes()
    const cert = certificate()!
    const anchor = trustAnchor()!
    if (!cert.issuer?.equals(anchor.name)) {
      console.log(`Invalid issuer: ${cert.issuer}`)
      setInProgress(false)
      return
    }
    if (!anchor.name.getPrefix(anchor.name.length - 4).isPrefixOf(cert.name)) {
      console.log(`Invalid namespace: ${cert.issuer}`)
      setInProgress(false)
      return
    }
    (async () => {
      try {
        const validator = await createVerifier(anchor, { algoList: [ECDSA] })
        validator.verify(cert.data)
      } catch (error) {
        console.log(`Unable to verify the signature: ${error}`)
        setInProgress(false)
        return
      }

      try {
        await bootstrapWorkspace({
          createNew: init,
          trustAnchor: anchor,
          ownCertificate: cert,
          prvKey: prvKeyBits,
        })
        setInProgress(false)
        console.log('Successfully bootstrapped.')
      } catch (error) {
        console.log(`Unable to bootstrap workspace: ${error}`)
        setInProgress(false)
        return
      }
    })()
  }

  const onStop = () => {
    stopWorkspace().then(() => { navigate('/profile', { replace: true }) })
  }

  return (
    <Stack spacing={2}>
      <AppNamespace
        trustAnchor={trustAnchor()}
        setTrustAnchor={setTrustAnchor}
        readOnly={inProgress() || booted()}
      />
      <Switch>
        <Match when={!booted()}>
          <BootSafebag
            setCertificate={setCertificate}
            setPrvKeyBytes={setPrvKeyBytes}
            inProgress={inProgress()}
          />
          <Stack direction="row" spacing={2} justifyContent='flex-end'>
            <Button
              variant="contained"
              color="secondary"
              sx={{ borderRadius: 9999, minWidth: 100, minHeight: 45 }}
              disabled={!readyToStart() || inProgress()}
              onClick={() => onBootrstap(true)}
            >
              CREATE
            </Button>
            <Button
              variant="contained"
              color="primary"
              sx={{ borderRadius: 9999, minWidth: 100, minHeight: 45 }}
              disabled={!readyToStart() || inProgress()}
              onClick={() => onBootrstap(false)}
            >
              JOIN
            </Button>
          </Stack>
        </Match>
        <Match when={booted()}>
          <OwnCertificate
            certificate={certificate()}
          />
          <Stack direction="row" spacing={2} justifyContent='flex-end'>
            <Button
              variant="contained"
              color="error"
              sx={{ borderRadius: 9999, minWidth: 100, minHeight: 45 }}
              onClick={onStop}
            >
              STOP
            </Button>
          </Stack>
        </Match>
      </Switch>
    </Stack>
  )
}
