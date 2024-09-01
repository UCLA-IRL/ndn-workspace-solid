import * as Y from 'yjs'
import { Button, Grid, TextField } from '@suid/material'
import { createSignal } from 'solid-js'
import { useNdnWorkspace } from '../../../Context'
import { getNamespace } from '@ucla-irl/ndnts-aux/sync-agent'
import { SequenceNum } from '@ndn/naming-convention2'
import { Decoder } from '@ndn/tlv'
import { Data } from '@ndn/packet'
import { toHex } from '@ndn/util'

// TODO: Make it to utils
const REF_LIST = ['GC', 'Deleted', 'JSON', 'Binary', 'String', 'Embed', 'Format', 'Type', 'Any', 'Doc', 'Skip']
// GC and Skip should not occur in content refs.
// Text document updates belong to String
// Chat updates belong to Any
// Creating a new file will create Type and Any

export default function UpdateInspect() {
  const { syncAgent, booted } = useNdnWorkspace()!
  const [nodeIdStr, setNodeIdStr] = createSignal<string>('')
  const [seqStr, setSeqStr] = createSignal<string>('')
  const [result, setResult] = createSignal<string>('')

  const onInspect = async () => {
    const agent = syncAgent()
    if (!agent) return
    try {
      const nodeId = agent.appPrefix.append(nodeIdStr())
      const seqNum = parseInt(seqStr())
      const appPrefix = agent.appPrefix
      const aloSyncPrefix = appPrefix.append(getNamespace().syncKeyword, getNamespace().atLeastOnceKeyword)
      const pktName = getNamespace().baseName(nodeId, aloSyncPrefix).append(SequenceNum.create(seqNum))
      const outerWire = await agent.persistStorage.get(pktName.toString())
      if (!outerWire) {
        setResult('NOT EXISTING')
        return
      }
      const outerData = Decoder.decode(outerWire, Data)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inner = await (agent as any).parseInnerData(outerData.content) as {
        channel: string
        topic: string
        content: Uint8Array
      }
      if (!inner) {
        setResult('INVALID PACKET')
        return
      }
      let result = `Channel: ${inner.channel}` + '\n'
      result += `Topic: ${inner.topic}` + '\n'
      if (inner.channel === 'update' && inner.topic === 'doc') {
        result += 'Yjs Update:\n'
        const update = Y.decodeUpdate(inner.content)
        for (const obj of update.structs) {
          if (obj instanceof Y.Item) {
            result += '  ITEM\n'
            result += `    id : ${JSON.stringify(obj.id)} --- ${JSON.stringify(obj.lastId)}\n`
            result += `    left : ${JSON.stringify(obj.origin)}\n`
            result += `    right: ${JSON.stringify(obj.rightOrigin)}\n`
            result += `    parent: ${JSON.stringify(obj.parent)}\n`
            result += `    parent sub: ${obj.parentSub}` + '\n'
            result += `    content ref(type): ${REF_LIST[obj.content.getRef()]}\n`
            result += `    content:\n`
            if (obj.content instanceof Y.ContentString) {
              result += `======== BEGIN CONTENT ========\n`
              result += `${obj.content.str}\n`
              result += `======== END CONTENT ========\n`
            } else if (obj.content instanceof Y.ContentAny) {
              result += `      ${JSON.stringify(obj.content.arr)}\n`
            } else if (obj.content instanceof Y.ContentType) {
              result += `      ${obj.content.type.toJSON()}\n`
            } else if (obj.content instanceof Y.ContentBinary) {
              result += `      ${toHex(obj.content.content)}\n`
            } else if (obj.content instanceof Y.ContentJSON) {
              result += `      ${JSON.stringify(obj.content.arr)}\n`
            } else if (obj.content instanceof Y.ContentFormat) {
              result += `      ${obj.content.key} = ${obj.content.value}\n`
            } else if (obj.content instanceof Y.ContentDoc) {
              result += `      Doc GUID: ${obj.content.doc.guid}\n`
            } else if (obj.content instanceof Y.ContentEmbed) {
              result += `      ${JSON.stringify(obj.content.embed)}\n`
            }
          } else if (obj instanceof Y.GC) {
            result += '  GC\n'
            result += `    id : ${JSON.stringify(obj.id)}\n`
            result += `    length: ${obj.length}` + '\n'
          } else if (obj instanceof Y.Skip) {
            result += '  SKIP\n'
            result += `    id : ${JSON.stringify(obj.id)}\n`
            result += `    length: ${obj.length}` + '\n'
          } else {
            result += `  ${obj}` + '\n'
          }
        }
        for (const [key, dels] of update.ds.clients) {
          result += `  DELETION client=${key}\n`
          for (const del of dels) {
            result += `    ${JSON.stringify(del)}\n`
          }
        }
      } else {
        result += 'Content HEX:\n' + toHex(inner.content)
      }
      setResult(result)
    } catch (err) {
      setResult(`${err}`)
    }
  }

  return (
    <>
      <h2>Update Inspect</h2>
      <Grid container spacing={1} alignItems="center">
        <Grid item xs={4}>
          <TextField
            fullWidth
            label="Node ID"
            name="nodeId"
            type="text"
            value={nodeIdStr()}
            onChange={(event) => setNodeIdStr(event.target.value)}
          />
        </Grid>
        <Grid item xs={4}>
          <TextField
            fullWidth
            label="Seq"
            name="seq"
            type="number"
            value={seqStr()}
            onChange={(event) => setSeqStr(event.target.value)}
          />
        </Grid>
        <Grid item xs={4}>
          <Button variant="text" color="primary" onClick={onInspect} disabled={!booted()}>
            Inspect
          </Button>
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            label="Result"
            name="inspect-result"
            type="text"
            rows={20}
            inputProps={{
              style: {
                'font-family': '"Roboto Mono", ui-monospace, monospace',
                'white-space': 'pre-wrap',
              },
              readOnly: true,
            }}
            value={result()}
          />
        </Grid>
      </Grid>
    </>
  )
}
