import * as Y from 'yjs'
import { Button, Grid, Typography } from '@suid/material'
import { createSignal, Match } from 'solid-js'
import { useNdnWorkspace } from '../../../Context'
import { encodeSyncState, getNamespace } from '@ucla-irl/ndnts-aux/sync-agent'
import { SequenceNum } from '@ndn/naming-convention2'
import { Decoder } from '@ndn/tlv'
import { Data, Name } from '@ndn/packet'
import { MoreHoriz as MoreHorizIcon } from '@suid/icons-material'
import { getYjsDoc } from '@syncedstore/core'
import { StateVector } from '@ndn/svs'
import { initRootDoc, project } from '../../../backend/models'
import { openRoot, encodeKey as encodePath } from '../../../utils'
import { FsStorage } from '@ucla-irl/ndnts-aux/storage'
import { reprStateVector } from '../workspace-state/index'
import toast from 'solid-toast'

const StateKey = 'localState'
const SnapshotKey = 'localSnapshot'

export default function RebuildCache() {
  const { syncAgent, booted, stopWorkspace } = useNdnWorkspace()!
  const [started, setStarted] = createSignal(false)

  const onRebuild = async () => {
    const agent = syncAgent()
    if (!agent) return
    setStarted(true)

    try {
      const oldState = agent.atLeastOnce.syncState
      const newState = new StateVector()

      // TODO: Reuse the init code
      const appPrefix = agent.appPrefix
      const aloSyncPrefix = appPrefix.append(getNamespace().syncKeyword, getNamespace().atLeastOnceKeyword)
      const newDoc = initRootDoc(project.WorkspaceDocId)
      const yDoc = getYjsDoc(newDoc)
      const clientID = yDoc.clientID
      yDoc.clientID = 1 // Set the client Id to be a common one to make the change common
      newDoc.latex[project.RootId] = {
        id: project.RootId,
        name: '',
        parentId: undefined,
        kind: 'folder',
        items: [],
        deleted: false,
      }
      yDoc.clientID = clientID

      // Iterate over old state vector
      for (const [nodeId, upperBound] of oldState) {
        let seqNum = 1
        for (seqNum = 1; seqNum <= upperBound; seqNum++) {
          const pktName = getNamespace().baseName(nodeId, aloSyncPrefix).append(SequenceNum.create(seqNum))
          const outerWire = await agent.persistStorage.get(pktName.toString())
          if (!outerWire) {
            console.error(`You missed update: ${nodeId}= ${seqNum}`)
            break
          }

          const outerData = Decoder.decode(outerWire, Data)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const inner = (await (agent as any).parseInnerData(outerData.content)) as {
            channel: string
            topic: string
            content: Uint8Array
          }

          if (inner.topic !== 'doc') continue
          let update = inner.content
          if (inner.channel === 'blobUpdate') {
            const name = Decoder.decode(inner.content, Name)
            const updateValue = await agent.getBlob(name)
            if (updateValue !== undefined) {
              // Notify the listener
              update = updateValue
            } else {
              console.error(`You missed update: ${nodeId}= ${seqNum}`)
              break
            }
          } else if (inner.channel !== 'update') {
            continue
          }

          Y.applyUpdate(yDoc, update, 'replay')
        }

        newState.set(nodeId, seqNum - 1)
      }

      //
      ;(agent.atLeastOnce as unknown as { state: StateVector }).state = new StateVector(newState)
      // Pray this does not get modified by incoming SVS Interest.

      // Rewrite the rebuilt state vector and the yjs document
      // This can only be done after the workspace is closed, so we need to manually create the persistant storage.
      const myNodeId = agent.nodeId
      await stopWorkspace()
      // agent = undefined

      const handle = await openRoot()
      const subFolder = await handle.getDirectoryHandle(encodePath(myNodeId.toString()), { create: true })
      const persistStore = new FsStorage(subFolder)

      const baseName = getNamespace().baseName(myNodeId, aloSyncPrefix)
      await persistStore.set(getNamespace().syncStateKey(baseName), encodeSyncState(newState))

      const update = Y.encodeStateAsUpdate(yDoc)
      await persistStore.set(SnapshotKey, update)
      await persistStore.set(StateKey, encodeSyncState(newState))

      console.log(`Rewritten to: ${JSON.stringify(reprStateVector(newState))}`)
      toast.success(`Rewritten to: ${JSON.stringify(reprStateVector(newState))}`)
    } catch (err) {
      console.log(`Failed to rebuild storage: ${err}`)
    }

    setStarted(false)
  }

  return (
    <>
      <h2>Rebuild Local Storage</h2>
      <Grid container spacing={1} alignItems="center">
        <Grid item xs={12}>
          <Typography>
            Please disconnect from the network and bootstrap into a workspace. Be aware that YOU MAY LOSE ALL YOUR DATA.
          </Typography>
        </Grid>
        <Grid item xs={4}>
          <Button variant="text" color="primary" onClick={onRebuild} disabled={!booted() || started()}>
            Rebuild
          </Button>
        </Grid>
        <Grid item xs={4}>
          <Match when={started()}>
            <MoreHorizIcon />
          </Match>
        </Grid>
      </Grid>
    </>
  )
}
