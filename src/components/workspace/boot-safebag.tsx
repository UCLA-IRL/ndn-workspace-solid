import {
  Card,
  CardContent,
  CardHeader,
  Divider,
  TextField,
  IconButton,
  Typography,
  Button,
  Backdrop,
} from '@suid/material'
import {
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  QrCodeScanner as QRIcon,
} from '@suid/icons-material'
import { Match, Show, Switch, createEffect, createSignal } from 'solid-js'
import { base64ToBytes } from '../../utils'
import { Decoder } from '@ndn/tlv'
import { SafeBag } from '@ndn/ndnsec'
import { Certificate } from '@ndn/keychain'
import CertQrCode from './qr-gen'
import QrReader from './qr-read'

export default function BootSafebag(props: {
  setCertificate: (value: Certificate | undefined) => void
  setPrvKeyBytes: (value: Uint8Array) => void
  inProgress: boolean
}) {
  const [expanded, setExpanded] = createSignal(true)
  const [safebagText, setSafebagText] = createSignal('')
  const [passphrase, setPassphrase] = createSignal('')
  const [nameStr, setNameStr] = createSignal('')
  const [errorText, setErrorText] = createSignal('')
  const [pwdErrorText, setPwdErrorText] = createSignal('')
  const [safeBag, setSafeBag] = createSignal<SafeBag>()
  const [sbagQrOpen, setSbagQrOpen] = createSignal(false)
  const [isPopupOpen, setPopupOpen] = createSignal(false)

  // Disable when bootstrapping
  const readOnly = () => props.inProgress

  createEffect(() => {
    const b64Value = safebagText()
    if (b64Value.length === 0) {
      setErrorText(`Safebag is empty`)
      setNameStr('')
      return
    }
    let wire
    try {
      wire = base64ToBytes(b64Value)
    } catch (e) {
      setErrorText(`Not valid base64 string`)
      setNameStr('')
      return
    }
    let userKey
    try {
      const safebag = Decoder.decode(wire, SafeBag)
      const cert = safebag.certificate
      userKey = cert.name.getPrefix(cert.name.length - 2)
      setSafeBag(safebag)
    } catch (e) {
      setErrorText(`Unable to parse certificate`)
      setNameStr('')
      return
    }
    setNameStr(userKey.toString())
    setErrorText('')
  })

  createEffect(() => {
    const safbg = safeBag()
    const pass = passphrase()
    const setPrvKeyBytes = props.setPrvKeyBytes
    const setCertificate = props.setCertificate
    if (pass.length > 0 && safbg !== undefined) {
      safbg
        .decryptKey(pass)
        .then((value) => {
          setPwdErrorText('')
          setPrvKeyBytes(value)
          setCertificate(safbg.certificate)
        })
        .catch(() => {
          setPwdErrorText('Wrong passphrase for the safebag')
          setPrvKeyBytes(new Uint8Array())
        })
    } else {
      setPwdErrorText('Please input the safebag and passphrase')
      setPrvKeyBytes(new Uint8Array())
    }
  })

  return (
    <Card>
      <CardHeader
        sx={{ textAlign: 'left' }}
        title="Myself"
        subheader={
          <Switch>
            <Match when={nameStr().length === 0}>
              <IconButton onClick={() => setPopupOpen(!isPopupOpen())}>
                <QRIcon color="primary" />
              </IconButton>
              <Typography color="secondary" component={'span'}>
                Please input the safebag and passphrase
              </Typography>
              <Typography color="secondary" component={'p'}>
                This can be obtained by: <code>ndnsec export -i /my-workspace/alice</code>
              </Typography>
              <Backdrop
                sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
                open={isPopupOpen()}
                onClick={() => setPopupOpen(false)}
              >
                <QrReader popupOpen={isPopupOpen()} setValue={setSafebagText} />
              </Backdrop>
            </Match>
            <Match when={pwdErrorText().length !== 0}>
              <Typography color="secondary" fontFamily='"Roboto Mono", ui-monospace, monospace'>
                {nameStr()}
              </Typography>
            </Match>
            <Match when={true}>
              <Typography color="primary" fontFamily='"Roboto Mono", ui-monospace, monospace'>
                {nameStr()}
              </Typography>
            </Match>
          </Switch>
        }
        action={
          <IconButton onClick={() => setExpanded(!expanded())}>
            <Show when={expanded()} fallback={<ExpandMoreIcon />}>
              <ExpandLessIcon />
            </Show>
          </IconButton>
        }
      />
      <Show when={expanded()}>
        <Divider />
        <CardContent>
          <div
            style={{
              display: 'flex',
              'flex-direction': 'column',
              'align-items': 'flex-end',
              'row-gap': '10px',
            }}
          >
            <TextField
              fullWidth
              required
              label="Passphrase for private"
              name="passphrase"
              type="password"
              disabled={readOnly()}
              helperText={pwdErrorText()}
              error={pwdErrorText() != ''}
              value={passphrase()}
              onChange={(event) => setPassphrase(event.target.value)}
            />
            <TextField
              fullWidth
              required
              multiline
              label="Safebag"
              name="safebag"
              type="text"
              rows={15}
              inputProps={{
                style: {
                  'font-family': '"Roboto Mono", ui-monospace, monospace',
                  'white-space': 'pre',
                },
              }}
              disabled={readOnly()}
              helperText={errorText()}
              error={errorText() != ''}
              value={safebagText()}
              onChange={(event) => setSafebagText(event.target.value)}
            />
            <Button onClick={() => setSbagQrOpen(true)} variant="contained" disabled={nameStr() === ''}>
              {' '}
              Show QR Code{' '}
            </Button>
            <Backdrop
              sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
              open={sbagQrOpen()}
              onClick={() => setSbagQrOpen(false)}
            >
              <CertQrCode value={safebagText()} />
            </Backdrop>
          </div>
        </CardContent>
      </Show>
    </Card>
  )
}
