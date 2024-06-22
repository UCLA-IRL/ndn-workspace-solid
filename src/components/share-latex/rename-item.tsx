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
import { FileType } from './new-item-modal'
import { Show, createSignal } from 'solid-js'
import { AttachFile as AttachFileIcon } from '@suid/icons-material'

export default function RenameItem(props: {
  fileType: FileType
  fileId: string
  onSubmit: (id: string, newName: string) => void
  onCancel: () => void
}) {
  const [name, setName] = createSignal('')
  const [newName, setNewName] = createSignal('')
  const title = () => {
    switch (props.fileType) {
      case 'folder':
        return 'Rename folder'
      case 'doc':
        return 'Rename .tex file'
      case 'richDoc':
        return 'Rename .xml rich document'
      case 'upload':
        return 'Rename blob file'
      default:
        return 'Rename file'
    }
  }

  return (
    <Dialog open={true}>
      <DialogTitle>{title()}</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          required
          label="New File Name"
          margin="normal"
          value={newName()}
          onChange={(event) => setNewName(event.target.value)}
          autoFocus
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onCancel} color="primary">
          Cancel
        </Button>
        <Button onClick={() => props.onSubmit(props.fileId, newName())} color="primary">
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  )
}
