import { Card, CardContent, CardHeader, Divider, TextField, IconButton, Typography } from '@suid/material'
import {
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  QrCodeScanner as QRIcon,
} from '@suid/icons-material'
import { Show, createEffect, createSignal } from 'solid-js'
import { base64ToBytes, bytesToBase64 } from '../../utils'
import { Decoder, Encoder } from '@ndn/tlv'
import { Data } from '@ndn/packet'
import { Certificate } from '@ndn/keychain'
import QrReader from './qr-read'

export default function AppNamespace(props: {
  trustAnchor: Certificate | undefined
  setTrustAnchor: (value: Certificate | undefined) => void
  readOnly: boolean
}) {
  const [expanded, setExpanded] = createSignal(true)
  const [value, setValue] = createSignal('')
  const [nameStr, setNameStr] = createSignal('')
  const [errorText, setErrorText] = createSignal('')
  const [edited, setEdited] = createSignal(false)
  //open or close video stream
  const [isPopupOpen, setPopupOpen] = createSignal(false)

  // const readyToImport = () => !readOnly() && nameStr().length === 0

  // Parse trust anchor on input
  createEffect(() => {
    const b64Value = value()
    if (b64Value.length === 0) {
      setErrorText(`Trust anchor is empty`)
      setNameStr('')
      if (!props.readOnly) {
        props.setTrustAnchor(undefined)
      }
      return
    }
    let wire
    try {
      wire = base64ToBytes(b64Value)
    } catch (e) {
      setErrorText(`Not valid base64 string`)
      setNameStr('')
      if (!props.readOnly) {
        props.setTrustAnchor(undefined)
      }
      return
    }
    try {
      const data = Decoder.decode(wire, Data)
      const cert = Certificate.fromData(data)
      if (!props.readOnly) {
        props.setTrustAnchor(cert)
      }
    } catch (e) {
      setErrorText(`Unable to parse certificate`)
      setNameStr('')
      return
    }
  })

  // Set name when a trust anchor is parsed
  createEffect(() => {
    const cert = props.trustAnchor
    if (cert !== undefined) {
      try {
        const rootName = cert.name.getPrefix(cert.name.length - 4)
        setNameStr(rootName.toString())
        setErrorText('')
      } catch (e) {
        setErrorText(`Invalid certificate name`)
        setNameStr('')
        if (!props.readOnly) {
          props.setTrustAnchor(undefined)
        }
      }
    }
  })

  const onChange = (newValue: string) => {
    if (!props.readOnly) {
      setValue(newValue)
      setEdited(true)
    }
  }

  // Load existing trust anchor, but only on loading
  createEffect(() => {
    if (!edited()) {
      const cert = props.trustAnchor
      if (cert !== undefined) {
        const b64Text = bytesToBase64(Encoder.encode(cert.data))
        const b64Breaks = b64Text.replace(/(.{64})/g, '$1\n')
        setValue(b64Breaks)
      }
    }
  })

  return (
    <Card>
      <CardHeader
        sx={{ textAlign: 'left' }}
        title="The Workspace"
        subheader={
          <Show
            when={nameStr().length === 0}
            fallback={
              <Typography color="primary" fontFamily='"Roboto Mono", ui-monospace, monospace'>
                {nameStr()}
              </Typography>
            }
          >
            <IconButton onClick={() => setPopupOpen(!isPopupOpen())}>
              <QRIcon color="primary" />
            </IconButton>
            <Typography color="secondary" component={'span'}>
              Please input the trust anchor exported by cert-dump
            </Typography>
            <Typography color="secondary" component={'p'}>
              After following instructions on <a href="/">home page</a>, this can be obtained by: <code>ndnsec cert-dump -i /my-workspace</code>
            </Typography>
            <QrReader popupOpen={isPopupOpen()} setValue={setValue} />
          </Show>
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
          <TextField
            fullWidth
            required
            multiline
            label="Trust Anchor"
            name="trust-anchor"
            type="text"
            rows={10}
            inputProps={{
              style: {
                'font-family': '"Roboto Mono", ui-monospace, monospace',
                'white-space': 'pre',
              },
            }}
            // disabled={readOnly()}  // disabled not working with multiline
            helperText={errorText()}
            error={errorText() != ''}
            value={value()}
            onChange={(event) => onChange(event.target.value)}
          />
        </CardContent>
      </Show>
    </Card>
  )
}
