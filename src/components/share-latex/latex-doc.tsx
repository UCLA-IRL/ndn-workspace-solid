/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore
import { createCodeMirror } from "solid-codemirror"
// @ts-ignore
import { yCollab } from 'y-codemirror.next'
// There is an error in y-codemirror.next's package.json.
import { EditorView, basicSetup } from "codemirror"
import { StreamLanguage } from '@codemirror/language'
import { stex } from '@codemirror/legacy-modes/mode/stex'
import * as Y from 'yjs'

export default function LatexDoc(props: {
  doc: Y.Text
}) {
  const theme = EditorView.theme({
    '&': {
      whiteSpace: "nowrap",
    },
    '.cm-content': {
      fontFamily: '"Roboto Mono", ui-monospace, monospace',
      fontSize: '15px',
    },
    '.cm-gutters': {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      backgroundColor: 'var(--md-sys-color-background)',
      color: 'var(--md-sys-color-on-background)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'var(--md-sys-color-shadow)',
      color: 'var(--md-sys-color-on-primary)',
    },
    '.ͼc': {  // Tokens {HERE}
      color: 'var(--md-sys-color-secondary)',
    },
    '.ͼi': {  // Commands  \HERE
      color: 'var(--theme-color-success)',
    },
    '.ͼm': {  // Comments  %HERE
      color: 'var(--theme-color-grey-600)',
    },
    '.ͼn': {  // Error
      color: 'var(--md-sys-color-error)',
    },
    '.ͼb': {  // Math dollor  $ <- THIS
      color: 'var(--md-sys-color-secondary)',
    },
    '.ͼk': {  // Symbols in math mode  $HERE$
      color: 'var(--md-sys-color-primary)',
    },
    '.ͼd': {  // Numbers in math mode  %HERE
      color: 'var(--theme-color-success)',
    },
  })

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

  return (
    <div ref={ref} style={{ "text-align": "left" }} />
  )
}
