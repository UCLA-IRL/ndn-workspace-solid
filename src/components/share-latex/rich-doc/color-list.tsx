import { createEditorTransaction } from 'solid-tiptap'
import { type Editor } from '@tiptap/core'
import { For } from 'solid-js'
import { Select, MenuItem } from '@suid/material'
import { SelectChangeEvent } from '@suid/material/Select'

const colors: Record<string, string> = {
  'primary': 'var(--md-sys-color-primary)',
  'primary-light': 'var(--md-sys-color-primary-container)',
  'secondary': 'var(--md-sys-color-secondary)',
  'secondary-light': 'var(--md-sys-color-secondary-container)',
  'tertiary': 'var(--md-sys-color-tertiary)',
  'tertiary-light': 'var(--md-sys-color-tertiary-container)',
  'success': 'var(--theme-color-success)',
  'success-light': 'var(--theme-color-success-container)',
  'error': 'var(--md-sys-color-error)',
  'error-light': 'var(--md-sys-color-error-container)',
  'default': '',
  'shadow': 'var(--theme-color-grey-600)',
}

const colorsInv = Object.fromEntries(Object.entries(colors).map(([k, v]) => [v, k]))

const ColorList = (props: {
  editor: Editor | undefined,
}) => {
  const value = createEditorTransaction(
    () => props.editor,
    (editor) => colorsInv[editor?.getAttributes('textStyle')?.color] ?? 'default',
  )

  const onChange = (name: string) => props.editor?.chain().focus()?.setColor(colors[name])?.run()
  const handleChange = (event: SelectChangeEvent) => {
    const name = event.target.value as string
    onChange(name)
  }

  return <>
    <Select
      id="color-select"
      value={value()}
      sx={{
        height: '40px',
        marginRight: '8px'
      }}
      onChange={handleChange}
    >
      <For each={Object.keys(colors)}>{key =>
        <MenuItem value={key}><span style={{ color: colors[key] }}>Color</span></MenuItem>
      }</For>
    </Select>
  </>
}

export default ColorList
