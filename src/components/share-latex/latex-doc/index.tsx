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
import { NdnSvsAdaptor } from '@ucla-irl/ndnts-aux/adaptors'
import { onCleanup } from 'solid-js'

export default function LatexDoc(props: { doc: Y.Text; provider: NdnSvsAdaptor; username: string; subDocId: string }) {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
  const theme = EditorView.theme(EditorTheme, { dark: prefersDarkMode() })

  onCleanup(() => {
    props.provider.cancelAwareness()
  })

  const getRandomColor = () =>
    '#' + Array.from({ length: 6 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')

  const { createExtension, ref } = createCodeMirror({
    // eslint-disable-next-line solid/reactivity
    value: props.doc.toString(),
  })

  // eslint-disable-next-line solid/reactivity
  props.provider.bindAwareness(props.doc.doc!, props.subDocId)

  // eslint-disable-next-line solid/reactivity
  props.provider.awareness!.setLocalStateField('user', {
    // eslint-disable-next-line solid/reactivity
    name: props.username,
    color: getRandomColor(),
    colorLight: getRandomColor(),
  })

  // Theme
  createExtension(theme)
  createExtension(EditorView.lineWrapping)

  // One cannot create extension in a createEffect
  createExtension(basicSetup)
  createExtension(StreamLanguage.define(stex))
  // eslint-disable-next-line solid/reactivity
  createExtension(yCollab(props.doc, props.provider.awareness))

  return <Paper ref={ref} sx={{ height: 1 }} />
}
