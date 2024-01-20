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
} from '@suid/material'
import { Config as Conn } from '../../backend/models/connections'
import { createSignal } from 'solid-js'

export default function PeerJs(props: { onAdd: (config: Conn) => void }) {
  const [host, setHost] = createSignal('localhost')
  const [port, setPort] = createSignal(8000)
  const [path, setPath] = createSignal('/aincraft')
  const [key, setKey] = createSignal('peerjs')

  return (
    <Card>
      <CardHeader sx={{ textAlign: 'left' }} title="PeerJS" />
      <Divider />
      <CardContent>
        <Grid container spacing={1}>
          <Grid item xs={8}>
            <TextField
              fullWidth
              label="Host"
              name="host"
              type="text"
              InputProps={{
                startAdornment: <InputAdornment position="start">http://</InputAdornment>,
              }}
              value={host()}
              onChange={(event) => setHost(event.target.value)}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="Port"
              name="port"
              type="number"
              value={port()}
              onChange={(event) => setPort(parseInt(event.target.value))}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Path"
              name="path"
              type="text"
              value={path()}
              onChange={(event) => setPath(event.target.value)}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Connection Key"
              name="key"
              type="text"
              value={key()}
              onChange={(event) => setKey(event.target.value)}
            />
          </Grid>
        </Grid>
      </CardContent>
      <Divider />
      <CardActions sx={{ justifyContent: 'flex-end' }}>
        <Button
          variant="text"
          color="primary"
          onClick={() =>
            props.onAdd({
              kind: 'peerJs',
              host: host(),
              port: port(),
              key: key(),
              path: path(),
            })
          }
        >
          ADD
        </Button>
      </CardActions>
    </Card>
  )
}
