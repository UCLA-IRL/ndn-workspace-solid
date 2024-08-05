import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@suid/material'
import { FileType } from './new-item-modal'
import { createSignal } from 'solid-js'

export default function RenameItem(props: {
  fileType: FileType
  fileId: string
  onSubmit: (id: string, newName: string) => void
  onCancel: () => void
}) {
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
      case 'markdownDoc':
        return 'Rename .md document'
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
