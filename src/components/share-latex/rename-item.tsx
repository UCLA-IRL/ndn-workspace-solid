import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  TextField,
} from '@suid/material'
import { ModalState } from './new-item-modal'
import { Show, createSignal } from 'solid-js'
import { AttachFile as AttachFileIcon } from '@suid/icons-material'

export default function RenameItem(props: {
  modalState: ModalState
  onSubmit: (id: string, newName: string) => void
  onCancel: () => void
}) {
  const [name, setName] = createSignal('')
  const [newName, setNewName] = createSignal('')
  const title = () => {
    switch (props.modalState) {
      case 'folder':
        return 'Rename folder'
      case 'doc':
        return 'Rename .tex file'
      case 'richDoc':
        return 'Rename .xml rich document'
      case 'upload':
        return 'Rename blob file'
      default:
        return ''
    }
  }

  return (
    <Dialog open={props.modalState !== ''}>
      <DialogTitle>{title()}</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          required
          label="Name"
          margin="normal"
          value={name()}
          onChange={(event) => setName(event.target.value)}
        />
      </DialogContent>
    </Dialog>
  )
}
