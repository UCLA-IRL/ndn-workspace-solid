import { createTiptapEditor } from 'solid-tiptap'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from "@tiptap/extension-collaboration"
import * as Y from 'yjs'
import { createSignal } from 'solid-js'

export default function Docs() {
  const [container, setContainer] = createSignal<HTMLDivElement>()

  const store = new Y.Doc()
  const doc = store.getXmlFragment()

  const editor = createTiptapEditor(() => ({
    element: container()!,
    extensions: [
      StarterKit,
      Collaboration.configure({
        fragment: doc,
      })
    ],
  }))

  return <div id="editor" ref={setContainer} />
}
