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

export default function NfdWebsocket() {
  const {
    connectionSetting: [conns, setConns],
    connectionStatus: status,
    connectFuncs: {
      nfdWs: [connNfdWs, disconnNfdWs]
    }
  } = useNdnWorkspace()!

  return <Card>
    <CardHeader
      sx={{ textAlign: 'left' }}
      title="WebSocket to NFD"
      subheader={<ConnStatus state={status.nfdWs} />}
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
                  ws://
                </InputAdornment>,
            }}
            disabled={status.nfdWs !== 'DISCONNECTED'}
            value={conns.nfdWs.host}
            onChange={event => setConns('nfdWs', 'host', () => event.target.value)}
          />
        </Grid>
        <Grid item xs={4}>
          <TextField
            fullWidth
            label="Port"
            name="port"
            type="number"
            disabled={status.nfdWs !== 'DISCONNECTED'}
            value={conns.nfdWs.port}
            onChange={event => setConns('nfdWs', 'port', () => parseInt(event.target.value))}
          />
        </Grid>
      </Grid>
    </CardContent>
    <Divider />
    <CardActions sx={{ justifyContent: 'flex-end' }}>
      <ConnButton
        state={status.nfdWs}
        onConnect={() => connNfdWs()}
        onDisonnect={() => disconnNfdWs()}
      />
    </CardActions>
  </Card>
}
