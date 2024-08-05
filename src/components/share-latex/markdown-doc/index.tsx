import { createSignal, onCleanup, onMount } from 'solid-js'
import { Editor, rootCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { history } from '@milkdown/plugin-history'
import { collab, CollabService, collabServiceCtx } from '@milkdown/plugin-collab'
import { nord } from '@milkdown/theme-nord'
import { NdnSvsAdaptor } from '@ucla-irl/ndnts-aux/adaptors'
import * as Y from 'yjs'

import '@milkdown/theme-nord/style.css'

export default function MarkdownDoc(props: {
  doc: Y.XmlFragment
  provider: NdnSvsAdaptor
  username: string
  subDocId: string
}) {
  const [container, setContainer] = createSignal<HTMLDivElement>()
  const [editor, setEditor] = createSignal<Editor>()
  const [collabService, setCollabService] = createSignal<CollabService>()

  onMount(async () => {
    const editor = await Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, container())
      })
      .config(nord)
      .use(commonmark)
      .use(history)
      .use(collab)
      .create()

    setEditor(editor)
    props.provider.bindAwareness(props.doc.doc!, props.subDocId)

    editor.action((ctx) => {
      const collabSrv = ctx.get(collabServiceCtx)
      setCollabService(collabSrv)

      collabSrv
        // bind doc and awareness
        .bindDoc(props.doc.doc!)
        .setAwareness(props.provider.awareness!)
        // connect yjs with milkdown
        .connect()
    })
  })

  onCleanup(() => {
    collabService()?.disconnect()
    props.provider.cancelAwareness()
    editor()?.destroy()
  })

  return <div ref={setContainer} />
}
