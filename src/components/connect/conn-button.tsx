import { Match, Switch } from "solid-js"
import { Button } from "@suid/material"
import { ConnState } from "../../Context"


export default function ConnButton(props: {
  state: ConnState
  onConnect: () => void
  onDisonnect: () => void,
}) {
  return (
    <Switch>
      <Match when={props.state === 'CONNECTED'}>
        <Button variant="text" color="error" onClick={props.onDisonnect}>
          DISCONNECT
        </Button>
      </Match>
      <Match when={props.state === 'DISCONNECTED'}>
        <Button variant="text" color="primary" onClick={props.onConnect}>
          CONNECT
        </Button>
      </Match>
      <Match when={props.state === 'CONNECTING'}>
        <Button variant="text" disabled>
          CONNECTING ...
        </Button>
      </Match>
      <Match when={props.state === 'DISCONNECTING'}>
        <Button variant="text" disabled>
          DISCONNECTING ...
        </Button>
      </Match>
    </Switch>
  )
}
