import { Stack } from '@suid/material'
import { useNdnWorkspace } from '../../../Context'
import * as Y from 'yjs'
import { getYjsDoc } from '@syncedstore/core'
import { For } from 'solid-js'

const getStateVector = (store: Y.Doc['store']): Map<number, number> => {
  const sm = new Map()
  store.clients.forEach((structs, client) => {
    const struct = structs[structs.length - 1]
    sm.set(client, struct.id.clock + struct.length)
  })
  return sm
}

export default function YjsStateVector() {
  const { rootDoc } = useNdnWorkspace()!
  const yDoc = () => {
    const store = rootDoc()
    return store ? getYjsDoc(store) : undefined
  }
  const stateVector = () => {
    const ydoc = yDoc()
    return ydoc ? getStateVector(ydoc.store) : undefined
  }

  stateVector()?.entries()

  return (
    <>
      <h2>YJS Internal State Vector</h2>
      <Stack spacing={2}>
        <For each={Array.from(stateVector() ?? [])}>
          {([uid, tim]: [number, number]) => (
            <>
              {uid}: {tim}
              <br />
            </>
          )}
        </For>
      </Stack>
    </>
  )
}
