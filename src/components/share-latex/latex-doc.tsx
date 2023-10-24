/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore
import { createCodeMirror } from "solid-codemirror"
// @ts-ignore
import { yCollab } from 'y-codemirror.next'
// There is an error in y-codemirror.next's package.json.
import { basicSetup } from "codemirror"
import { StreamLanguage } from '@codemirror/language'
import { stex } from '@codemirror/legacy-modes/mode/stex'
import * as Y from 'yjs'

export default function LatexDoc(props: {
  doc: Y.Text
}) {
  // TODO: Need fix size
  // TODO: useSyncedStore becomes createStore in SolidJS. But does this work?

  const { createExtension, ref } = createCodeMirror({
    value: props.doc.toString(),
  })

  // One cannot create extension in a createEffect
  createExtension(basicSetup)
  createExtension(StreamLanguage.define(stex))
  // eslint-disable-next-line solid/reactivity
  createExtension(yCollab(props.doc, null))

  return (
    <div ref={ref} style={{ "text-align": "left" }} />
  )
}
