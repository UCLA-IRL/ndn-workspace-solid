import { Dialog, Button, DialogTitle, DialogContent, DialogActions, TextField } from '@suid/material'
import { createSignal } from 'solid-js'

export default function NewItemModal(props: {
  visible: boolean,
  title: string,
  onSubmit: (name: string) => void,
  onCancel: () => void,
}) {
  const [name, setName] = createSignal('')

  return (
    <Dialog
      open={props.visible}
    >
      <DialogTitle>
        {props.title}
      </DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          required
          label='Name'
          margin='normal'
          value={name()}
          onChange={(event) => setName(event.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button
          type="reset"
          onClick={props.onCancel}>
          Back
        </Button>
        <Button
          type="submit"
          onClick={() => props.onSubmit(name())}
          disabled={name() === ''}
          autofocus>
          Add
        </Button>
      </DialogActions>
    </Dialog>
  )
}