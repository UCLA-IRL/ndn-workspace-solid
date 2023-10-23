import { Match, Switch } from "solid-js"
import { ConnState } from "../../Context"
import { Typography } from "@suid/material"

export default function ConnStatus(props: { state: ConnState }) {
  return (
    <Switch>
      <Match when={props.state === 'CONNECTED'}>
        <Typography variant="subtitle1" color="primary">CONNECTED</Typography>
      </Match>
      <Match when={props.state === 'DISCONNECTED'}>
        <Typography variant="subtitle1" color="error">NOT CONNECTED</Typography>
      </Match>
      <Match when={props.state === 'CONNECTING'}>
        <Typography variant="subtitle1" color="text.disabled">CONNECTING</Typography>
      </Match>
      <Match when={props.state === 'DISCONNECTING'}>
        <Typography variant="subtitle1" color="text.disabled">DISCONNECTING</Typography>
      </Match>
    </Switch>
  )
}