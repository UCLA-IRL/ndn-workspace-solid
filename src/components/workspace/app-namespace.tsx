import {
  Card,
  CardContent,
  CardHeader,
  Divider,
  TextField,
  IconButton,
  Typography,
} from "@suid/material"
import {
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
} from '@suid/icons-material'
import { Show, createEffect, createSignal } from "solid-js"
import { base64ToBytes } from "../../utils/base64"
import { Decoder } from "@ndn/tlv"
import { Data } from "@ndn/packet"
import { Certificate } from "@ndn/keychain"

export default function AppNamespace(props: {
  trustAnchor: Certificate | undefined,
  setTrustAnchor: (value: Certificate | undefined) => void,
}) {
  const [expanded, setExpanded] = createSignal(true)
  // TODO: Use existing value if possible
  const [value, setValue] = createSignal('')
  const [nameStr, setNameStr] = createSignal('')
  const [errorText, setErrorText] = createSignal('')

  // TODO: Disable when bootstrapped
  const readOnly = () => false
  // const readyToImport = () => !readOnly() && nameStr().length === 0

  createEffect(() => {
    const b64Value = value()
    if (b64Value.length === 0) {
      setErrorText(`Trust anchor is empty`)
      setNameStr('')
      props.setTrustAnchor(undefined)
      return
    }
    let wire
    try {
      wire = base64ToBytes(b64Value)
    } catch (e) {
      setErrorText(`Not valid base64 string`)
      setNameStr('')
      props.setTrustAnchor(undefined)
      return
    }
    try {
      const decoder = new Decoder(wire)
      const data = Data.decodeFrom(decoder)
      const cert = Certificate.fromData(data)
      props.setTrustAnchor(cert)
    } catch (e) {
      setErrorText(`Unable to parse certificate`)
      setNameStr('')
      return
    }
  })

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
        props.setTrustAnchor(undefined)
      }
    }
  })

  return <Card>
    <CardHeader
      sx={{ textAlign: 'left' }}
      title="The Workspace"
      subheader={
        <Show when={nameStr().length === 0} fallback={
          <Typography color="primary" fontFamily='"Roboto Mono", ui-monospace, monospace'>{nameStr()}</Typography>
        }>
          <Typography color="secondary">Please input the trust anchor exported by cert-dump</Typography>
        </Show>
      }
      action={
        <IconButton onClick={() => setExpanded(!expanded())} >
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
              "font-family": '"Roboto Mono", ui-monospace, monospace',
              "white-space": "nowrap"
            }
          }}
          disabled={readOnly()}
          helperText={errorText()}
          error={errorText() != ''}
          value={value()}
          onChange={event => setValue(event.target.value)}
        />
      </CardContent>
      {/* <Divider />
      <CardActions sx={{ justifyContent: 'flex-end' }}>
        <Button variant="text" color="primary" disabled={readyToImport()}>
          IMPORT
        </Button>
      </CardActions> */}
    </Show >
  </Card >
}
