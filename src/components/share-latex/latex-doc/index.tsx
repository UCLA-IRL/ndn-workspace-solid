/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore
import { createCodeMirror } from 'solid-codemirror'
// @ts-ignore
import { yCollab } from 'y-codemirror.next'
// There is an error in y-codemirror.next's package.json.
import { EditorView, basicSetup } from 'codemirror'
import { StreamLanguage } from '@codemirror/language'
import { stex } from '@codemirror/legacy-modes/mode/stex'
import * as Y from 'yjs'
import { Paper, useMediaQuery } from '@suid/material'
import EditorTheme from './theme'

export default function LatexDoc(props: { doc: Y.Text }) {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
  const theme = EditorView.theme(EditorTheme, { dark: prefersDarkMode() })

  const { createExtension, ref } = createCodeMirror({
    value: props.doc.toString(),
  })

  // Theme
  createExtension(theme)
  createExtension(EditorView.lineWrapping)

  // One cannot create extension in a createEffect
  createExtension(basicSetup)
  createExtension(StreamLanguage.define(stex))
  // eslint-disable-next-line solid/reactivity
  createExtension(yCollab(props.doc, null))

  return <Paper ref={ref} sx={{ height: 1 }} />
}
