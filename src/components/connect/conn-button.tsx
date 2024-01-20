import { Match, Switch } from 'solid-js'
import { IconButton } from '@suid/material'
import { PlayArrow as PlayArrowIcon, MoreHoriz as MoreHorizIcon, Stop as StopIcon } from '@suid/icons-material'
import { ConnState } from '../../backend/main'

export default function ConnButton(props: {
  state: ConnState
  isCur: boolean
  onConnect: () => void
  onDisonnect: () => void
}) {
  return (
    <Switch>
      <Match when={props.state === 'CONNECTED' && props.isCur}>
        <IconButton color="error" onClick={props.onDisonnect}>
          <StopIcon />
        </IconButton>
      </Match>
      <Match when={props.state === 'DISCONNECTED'}>
        <IconButton color="success" onClick={props.onConnect}>
          <PlayArrowIcon />
        </IconButton>
      </Match>
      <Match when={true}>
        <IconButton disabled>
          <MoreHorizIcon />
        </IconButton>
      </Match>
    </Switch>
  )
}
