import { Stack } from '@suid/material'
import { useNdnWorkspace } from '../../../Context'
import { Match, Switch } from 'solid-js'
import { StateVector } from '@ndn/svs'

export const reprStateVector = (sv?: StateVector): Record<string, number> => {
  if (!sv) return {}
  const ret = {} as Record<string, number>
  let unknownNum = 0
  for (const [id, seq] of sv) {
    ret[id.get(-1)?.text ?? `Unknown-${++unknownNum}`] = seq
  }
  return ret
}

export default function WorkspaceState() {
  const { syncAgent, booted } = useNdnWorkspace()!
  const nodeId = () => syncAgent()?.nodeId?.toString() ?? ''
  const aloObtained = () => JSON.stringify(reprStateVector(syncAgent()?.atLeastOnce?.syncState))
  const aloFront = () => JSON.stringify(reprStateVector(syncAgent()?.atLeastOnce?.syncInst?.currentStateVector))

  // TODO: Update the sv dynamically using `createInterval`

  return (
    <>
      <h2>State</h2>
      <Switch fallback={<Stack spacing={2}>Not Joined</Stack>}>
        <Match when={booted()}>
          <Stack spacing={2}>
            <p>Identity: {nodeId()}</p>
            <p>
              Persistent State: <code>{aloObtained()}</code>
            </p>
            <p>
              Sync Latest State: <code>{aloFront()}</code>
            </p>
          </Stack>
        </Match>
      </Switch>
    </>
  )
}
