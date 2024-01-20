import { Card, CardActions, CardContent, CardHeader, Divider, TextField, Grid, Button } from '@suid/material'
import { Config as Conn } from '../../backend/models/connections'
import { createSignal } from 'solid-js'
import { base64ToBytes, bytesToBase64 } from '../../utils'
import { Decoder, Encoder } from '@ndn/tlv'
import { SafeBag } from '@ndn/ndnsec'

export default function NfdWebsocket(props: { onAdd: (config: Conn) => void }) {
  const [uriText, setUriText] = createSignal('ws://localhost:9696/')
  const [safebagText, setSafebagText] = createSignal('')
  const [passphrase, setPassphrase] = createSignal('')

  const onClickAdd = async () => {
    const safebagB64 = safebagText()
    const pass = passphrase()
    let uri = uriText()
    if (!uri.endsWith('/')) {
      uri += '/'
    }
    const hostname = new URL(uri).hostname
    const isLocal = ['localhost', '127.0.0.1'].some((v) => v === hostname)
    if (safebagB64 === '' && pass === '') {
      // No signing
      props.onAdd({
        kind: 'nfdWs',
        uri: uri,
        isLocal: isLocal,
        ownCertificateB64: '',
        prvKeyB64: '',
      })
      return
    }
    if (safebagB64 === '' || pass === '') {
      console.error(
        'Leave both passphrase and safebag as empty to use a digest signer.' + 'Otherwise, you need to provide both.',
      )
      return
    }
    try {
      // Decode certificate and private keys
      const safeBagWire = base64ToBytes(safebagB64)
      const safeBag = Decoder.decode(safeBagWire, SafeBag)
      const cert = safeBag.certificate
      const prvKeyBits = await safeBag.decryptKey(pass)
      // Re encode certificate and private keys for storage
      // TODO: Is cbor a better choice?
      const certB64 = bytesToBase64(Encoder.encode(cert.data))
      const prvKeyB64 = bytesToBase64(prvKeyBits)
      props.onAdd({
        kind: 'nfdWs',
        uri,
        isLocal,
        ownCertificateB64: certB64,
        prvKeyB64,
      })
      return
    } catch (err) {
      console.error('Unable to decode the provided credential.')
      return
    }
  }

  return (
    <Card>
      <CardHeader sx={{ textAlign: 'left' }} title="WebSocket to NFD" />
      <Divider />
      <CardContent>
        <Grid container spacing={1}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="URI"
              name="uri"
              type="text"
              value={uriText()}
              onChange={(event) => setUriText(event.target.value)}
            />
          </Grid>
          {/* TODO: Reuse workspace's safebag component */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              label="Passphrase for private"
              name="passphrase"
              type="password"
              value={passphrase()}
              onChange={(event) => setPassphrase(event.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
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
              value={safebagText()}
              onChange={(event) => setSafebagText(event.target.value)}
            />
          </Grid>
        </Grid>
      </CardContent>
      <Divider />
      <CardActions sx={{ justifyContent: 'flex-end' }}>
        <Button variant="text" color="primary" onClick={() => onClickAdd()}>
          ADD
        </Button>
      </CardActions>
    </Card>
  )
}
