import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  Checkbox,
  FormControlLabel,
} from '@suid/material'
import { createSignal, createEffect, For } from 'solid-js'

interface ToggleChannelVisibilityDialogProps {
  open: boolean
  channels: () => string[] // visible channels
  hiddenChannels: () => string[] // hidden channels
  setHiddenChannels: (channels: string[]) => void
  onClose: () => void
}

export function ToggleChannelVisibilityDialog(props: ToggleChannelVisibilityDialogProps) {
  // Track all displayed channels and their checked state
  const [selectedChannels, setSelectedChannels] = createSignal<string[]>([])

  // Initialize selected channels when dialog opens
  createEffect(() => {
    if (props.open) {
      // Start with currently visible channels
      setSelectedChannels([...props.channels()])
    }
  })

  const handleToggleChannel = (channel: string, checked: boolean) => {
    if (checked) {
      setSelectedChannels([...selectedChannels(), channel])
    } else {
      setSelectedChannels(selectedChannels().filter((c) => c !== channel))
    }
  }

  const handleSave = () => {
    if (selectedChannels().length === 0) {
      // At least one channel must be visible
      return
    }

    // Calculate which channels should be hidden (all channels minus selected ones)
    const allChannels = [...props.channels(), ...props.hiddenChannels()]
    const newHiddenChannels = allChannels.filter((channel) => !selectedChannels().includes(channel))
    props.setHiddenChannels(newHiddenChannels)
    props.onClose()
  }

  const isChannelSelected = (channel: string) => {
    return selectedChannels().includes(channel)
  }

  // Get all channels (visible and hidden)
  const allChannels = () => {
    const combined = [...props.channels(), ...props.hiddenChannels()]
    return [...new Set(combined)].sort() // Remove duplicates and sort
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="sm">
      <DialogTitle>Toggle Channel Visibility</DialogTitle>
      <DialogContent>
        <List sx={{ minWidth: '300px' }}>
          <For each={allChannels()}>
            {(channel) => (
              <ListItem disablePadding>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isChannelSelected(channel)}
                      onChange={(_, checked) => handleToggleChannel(channel, checked)}
                    />
                  }
                  label={`#${channel}`}
                  sx={{ width: '100%', margin: '4px 0' }}
                />
              </ListItem>
            )}
          </For>
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={selectedChannels().length === 0} color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}
