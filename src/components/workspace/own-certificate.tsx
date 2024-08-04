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
import { ExpandLess as ExpandLessIcon, ExpandMore as ExpandMoreIcon } from '@suid/icons-material'
import { Show, createEffect, createSignal } from 'solid-js'
import { bytesToBase64 } from '../../utils'
import { Encoder } from '@ndn/tlv'
import { Certificate } from '@ndn/keychain'
import CertQrCode from './qr-gen'

export default function OwnCertificate(props: { certificate: Certificate | undefined }) {
  const [expanded, setExpanded] = createSignal(true)
  const [nameStr, setNameStr] = createSignal('')
  const [certText, setCertText] = createSignal('')
  const [certQrOpen, setCertQrOpen] = createSignal(false)

  createEffect(() => {
    const cert = props.certificate
    if (cert !== undefined) {
      try {
        const userKey = cert.name.getPrefix(cert.name.length - 2)
        setNameStr(userKey.toString())
      } catch {
        setNameStr('')
      }
      try {
        const b64Text = bytesToBase64(Encoder.encode(cert.data))
        const b64Breaks = b64Text.replace(/(.{64})/g, '$1\n')
        setCertText(b64Breaks)
      } catch {
        setCertText('')
      }
    } else {
      setNameStr('')
      setCertText('')
    }
  })

  return (
    <Card>
      <CardHeader
        sx={{ textAlign: 'left' }}
        title="Myself"
        subheader={
          <Typography color="primary" fontFamily='"Roboto Mono", ui-monospace, monospace'>
            {nameStr()}
          </Typography>
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
          <div style={{ display: 'flex', 'flex-direction': 'column', 'align-items': 'flex-end', 'row-gap': '10px' }}>
            <TextField
              fullWidth
              multiline
              label="My Certificate"
              name="certificate"
              type="text"
              rows={14}
              inputProps={{
                // readOnly: true,  // readOnly does not work with multiline
                style: {
                  'font-family': '"Roboto Mono", ui-monospace, monospace',
                  'white-space': 'pre',
                },
              }}
              value={certText()}
            />
            <Button onClick={() => setCertQrOpen(true)} variant="contained" disabled={nameStr() === ''}>
              {' '}
              Show QR Code{' '}
            </Button>
            <Backdrop
              sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
              open={certQrOpen()}
              onClick={() => setCertQrOpen(false)}
            >
              <CertQrCode value={certText()} />
            </Backdrop>
          </div>
        </CardContent>
      </Show>
    </Card>
  )
}
