import { nord } from '@milkdown/theme-nord'
import { createSignal, onCleanup, onMount } from 'solid-js'
import { Editor, rootCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { history } from '@milkdown/plugin-history'
import { collab, CollabService, collabServiceCtx } from '../../../adaptors/milkdown-plugin-synced-store/collab-service'
import { cursor } from '@milkdown/plugin-cursor'
import { indent, indentConfig, IndentConfigOptions } from '@milkdown/plugin-indent'
import { clipboard } from '@milkdown/plugin-clipboard'
import { NdnSvsAdaptor } from '@ucla-irl/ndnts-aux/adaptors'
import * as Y from 'yjs'

import '@milkdown/theme-nord/style.css'

import './style.scss'

export default function MarkdownDoc(props: {
  doc: Y.XmlFragment
  provider: NdnSvsAdaptor
  username: string
  subDocId: string
}) {
  const [collabService, setCollabService] = createSignal<CollabService>()

  let ref!: HTMLDivElement
  let editor: Editor
  onMount(async () => {
    editor = await Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, ref)
      })
      .config((ctx) => {
        ctx.set(indentConfig.key, {
          type: 'space',
          size: 4,
        } satisfies IndentConfigOptions)
      })
      .config(nord)
      .use(commonmark)
      .use(history)
      .use(cursor)
      .use(indent)
      .use(clipboard)
      .use(collab)
      .create()

    props.provider.bindAwareness(props.doc.doc!, props.subDocId)

    editor.action((ctx) => {
      const collabSrv = ctx.get(collabServiceCtx)
      setCollabService(collabSrv)

      collabSrv
        // bind doc and awareness
        .bindFragment(props.doc)
        .setAwareness(props.provider.awareness!)
        // connect yjs with milkdown
        .connect()
    })
  })

  onCleanup(() => {
    collabService()?.disconnect()
    props.provider.cancelAwareness()
    editor.destroy()
  })

  return <div ref={ref} />
}
