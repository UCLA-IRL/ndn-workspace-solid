import { Button, Grid, TextField } from '@suid/material'
import { createSignal } from 'solid-js'
import { useNdnWorkspace } from '../../../Context'
import toast from 'solid-toast'
import { getNamespace } from '@ucla-irl/ndnts-aux/sync-agent'
import { SequenceNum } from '@ndn/naming-convention2'
import { Decoder } from '@ndn/tlv'
import { Data, Name } from '@ndn/packet'
import * as Y from 'yjs'
import { initRootDoc, project } from '../../../backend/models'
import { getYjsDoc } from '@syncedstore/core'

export default function FileHistory() {
  const { syncAgent, booted } = useNdnWorkspace()!
  const [stateVector, setStateVector] = createSignal<string>('')
  const [fileUUID, setFileUUID] = createSignal<string>('')

  const onObtain = async () => {
    const svStr = stateVector()
    const uuidStr = fileUUID()
    const agent = syncAgent()!
    let svJson
    try {
      svJson = JSON.parse(svStr) as Record<string, number>
    } catch (err) {
      toast.error('Unable to parse state vector JSON')
      console.error(`Unable to parse state vector JSON: ${err}`)
      return
    }

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
    for (const [idStr, seq] of Object.entries(svJson)) {
      if (typeof idStr !== 'string' || typeof seq !== 'number') {
        toast.error(`Invalid State Vector: ${idStr}= ${seq}`)
        console.error(`Invalid State Vector: ${idStr}= ${seq}`)
        return
      }
      const nodeId = agent.appPrefix.append(idStr)

      // Replay. The same as Update Inspect
      for (let seqNum = 1; seqNum <= seq; seqNum++) {
        const pktName = getNamespace().baseName(nodeId, aloSyncPrefix).append(SequenceNum.create(seqNum))
        const outerWire = await agent.persistStorage.get(pktName.toString())
        if (!outerWire) {
          toast.error(`You missed update: ${idStr}= ${seqNum}`)
          console.error(`You missed update: ${idStr}= ${seqNum}`)
          continue
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
            toast.error(`You missed update: ${idStr}= ${seqNum}`)
            console.error(`You missed update: ${idStr}= ${seqNum}`)
            continue
          }
        } else if (inner.channel !== 'update') {
          continue
        }

        Y.applyUpdate(yDoc, update, 'replay')
      }
    }

    const item = newDoc.latex[uuidStr]
    let blob
    if (item?.kind === 'text') {
      blob = new Blob([item.text.toString()], { type: 'text/plain' })
    } else if (item?.kind === 'xmldoc') {
      blob = new Blob([item.text.toString()], { type: 'text/plain' })
    } else if (item?.kind === 'markdowndoc') {
      blob = new Blob([item.prosemirror.toString()], { type: 'text/plain' })
    } else {
      blob = new Blob([JSON.stringify(item)], { type: 'application/json' })
    }
    const objUrl = URL.createObjectURL(blob)
    window.open(objUrl)
  }

  return (
    <>
      <h2>Historical Version of File</h2>
      <Grid container spacing={1} alignItems="center">
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="State Vector JSON"
            name="stateVector"
            type="text"
            value={stateVector()}
            onChange={(event) => setStateVector(event.target.value)}
          />
        </Grid>
        <Grid item xs={9}>
          <TextField
            fullWidth
            label="File or Folder UUID"
            name="fileUUID"
            type="text"
            value={fileUUID()}
            onChange={(event) => setFileUUID(event.target.value)}
          />
        </Grid>
        <Grid item xs={3}>
          <Button variant="text" color="primary" onClick={onObtain} disabled={!booted()}>
            Obtain
          </Button>
        </Grid>
      </Grid>
    </>
  )
}
