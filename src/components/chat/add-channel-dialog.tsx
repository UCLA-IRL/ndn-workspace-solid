import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Checkbox, FormControlLabel } from '@suid/material'
import { createSignal } from 'solid-js'

interface AddChannelDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (channelName: string) => void
}

export function AddChannelDialog(props: AddChannelDialogProps) {
  const [channelName, setChannelName] = createSignal('')
  const [confirmed, setConfirmed] = createSignal(false)

  const handleSubmit = () => {
    if (channelName().trim() && confirmed()) {
      props.onConfirm(channelName().trim())
      setChannelName('')
      setConfirmed(false)
    }
  }

  const handleClose = () => {
    setChannelName('')
    setConfirmed(false)
    props.onClose()
  }

  return (
    <Dialog open={props.open} onClose={handleClose}>
      <DialogTitle>Add New Channel</DialogTitle>
      <DialogContent>
        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem', 'min-width': '300px', 'margin-top': '1rem' }}>
          <TextField
            autoFocus
            label="Channel Name"
            value={channelName()}
            onChange={(e) => setChannelName(e.target.value)}
            fullWidth
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={confirmed()}
                onChange={(_, checked) => setConfirmed(checked)}
              />
            }
            label="I understand that this channel cannot be deleted after the first message is sent and cannot be renamed"
          />
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          disabled={!channelName().trim() || !confirmed()}
          color="primary"
        >
          Create Channel
        </Button>
      </DialogActions>
    </Dialog>
  )
}
