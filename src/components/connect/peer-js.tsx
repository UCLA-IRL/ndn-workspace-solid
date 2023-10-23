import {
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Divider,
  InputAdornment,
  TextField,
  Grid,
} from "@suid/material"
import { useNdnWorkspace } from "../../Context"
import ConnStatus from "./conn-state"
import ConnButton from "./conn-button"

export default function PeerJs() {
  const {
    connectionSetting: [conns, setConns],
    connectionStatus: status,
    connectFuncs: {
      peerJs: [connPeerJs, disconnPeerJs]
    }
  } = useNdnWorkspace()!

  return <Card>
    <CardHeader
      sx={{ textAlign: 'left' }}
      title="PeerJS"
      subheader={<ConnStatus state={status.peerJs} />}
    />
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
              startAdornment:
                <InputAdornment position="start">
                  http://
                </InputAdornment>,
            }}
            disabled={status.peerJs !== 'DISCONNECTED'}
            value={conns.peerJs.host}
            onChange={event => setConns('peerJs', 'host', () => event.target.value)}
          />
        </Grid>
        <Grid item xs={4}>
          <TextField
            fullWidth
            label="Port"
            name="port"
            type="number"
            disabled={status.peerJs !== 'DISCONNECTED'}
            value={conns.peerJs.port}
            onChange={event => setConns('peerJs', 'port', () => parseInt(event.target.value))}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Path"
            name="path"
            type="text"
            disabled={status.peerJs !== 'DISCONNECTED'}
            value={conns.peerJs.path}
            onChange={event => setConns('peerJs', 'path', () => event.target.value)}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Connection Key"
            name="key"
            type="text"
            disabled={status.peerJs !== 'DISCONNECTED'}
            value={conns.peerJs.key}
            onChange={event => setConns('peerJs', 'key', () => event.target.value)}
          />
        </Grid>
      </Grid>
    </CardContent>
    <Divider />
    <CardActions sx={{ justifyContent: 'flex-end' }}>
      <ConnButton
        state={status.peerJs}
        onConnect={() => connPeerJs()}
        onDisonnect={() => disconnPeerJs()}
      />
    </CardActions>
  </Card>
}
