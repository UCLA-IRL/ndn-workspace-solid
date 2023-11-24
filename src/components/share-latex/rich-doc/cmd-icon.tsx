import { createEditorTransaction } from 'solid-tiptap'
import { type ChainedCommands, type Editor } from '@tiptap/core'
import { ParentProps } from 'solid-js'
import { IconButton } from '@suid/material'

const CmdIcon = (props: ParentProps<{
  editor: Editor | undefined,
  toggle: (cmd?: ChainedCommands) => ChainedCommands | undefined,
  activeName?: string,
  activeAttr?: object,
  noChecking?: boolean,
}>) => {
  const onClick = () => props.toggle(props.editor?.chain().focus())?.run()
  const disabled = createEditorTransaction(
    () => props.editor,
    (editor) => {
      if (props.noChecking) {
        return props.editor === undefined
      } else {
        return !props.toggle(editor?.can().chain().focus())?.run()
      }
    })
  const isActive = createEditorTransaction(
    () => props.editor,
    (editor) => {
      if (props.activeName !== undefined) {
        return editor?.isActive(props.activeName, props.activeAttr) ?? false
      } else {
        return false
      }
    })

  return (<IconButton
    onClick={onClick}
    disabled={disabled()}
    color={isActive() ? 'primary' : undefined}
  >
    {props.children}
  </IconButton>)
}

export default CmdIcon