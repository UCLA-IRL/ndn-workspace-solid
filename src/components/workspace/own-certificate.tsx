import { Card, CardContent, CardHeader, Divider, TextField, IconButton, Typography } from '@suid/material'
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

  createEffect(() => {
    const cert = props.certificate
    if (cert !== undefined) {
      try {
        const userKey = cert.name.getPrefix(cert.name.length - 2)
        setNameStr(userKey.toString())
      } catch (e) {
        setNameStr('')
      }
      try {
        const b64Text = bytesToBase64(Encoder.encode(cert.data))
        const b64Breaks = b64Text.replace(/(.{64})/g, '$1\n')
        setCertText(b64Breaks)
      } catch (e) {
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
          <div style={{ display: 'flex', 'align-items': 'flex-start' }}>
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
            <div>
              <CertQrCode value={certText()} />
            </div>
          </div>
        </CardContent>
      </Show>
    </Card>
  )
}
