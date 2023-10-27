import {
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Divider,
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
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="URI"
            name="uri"
            type="text"
            InputProps={{
              // startAdornment:
              //   <InputAdornment position="start">
              //     wss://
              //   </InputAdornment>,
            }}
            disabled={status.nfdWs !== 'DISCONNECTED'}
            value={conns.nfdWs.uri}
            onChange={event => setConns('nfdWs', 'uri', () => event.target.value)}
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
