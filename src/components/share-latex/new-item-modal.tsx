import { AttachFile as AttachFileIcon, Clear as ClearIcon, CloudUpload as CloudUploadIcon } from '@suid/icons-material'
import {
  Dialog,
  Button,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  IconButton,
  styled,
} from '@suid/material'
import { Show, createSignal } from 'solid-js'

export type ModalState = '' | 'folder' | 'doc' | 'upload' | 'richDoc'

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
})

export default function NewItemModal(props: {
  modalState: ModalState
  onSubmit: (name: string, state: ModalState, blob?: Uint8Array) => void
  onCancel: () => void
}) {
  const [name, setName] = createSignal('')
  const [inputRef, setInputRef] = createSignal<HTMLInputElement>()
  const [fileName, setFileName] = createSignal('')
  const [blob, setBlob] = createSignal(new Uint8Array())
  const title = () => {
    switch (props.modalState) {
      case 'folder':
        return 'New folder'
      case 'doc':
        return 'New .tex file'
      case 'richDoc':
        return 'New .xml rich document'
      case 'upload':
        return 'Upload blob file'
      default:
        return ''
    }
  }

  const onUpload = () => {
    const files = inputRef()?.files
    if (files && files.length > 0) {
      setFileName(files[0].name)
      if (name() === '') {
        setName(files[0].name)
      }
      files[0].arrayBuffer().then((arrayBuf) => {
        setBlob(new Uint8Array(arrayBuf))
      })
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
        <Show when={props.modalState === 'upload'}>
          <TextField
            fullWidth
            label="File Attachment"
            margin="normal"
            variant="filled"
            value={fileName()}
            InputProps={{
              readOnly: true,
              startAdornment: (
                <InputAdornment position="start">
                  <AttachFileIcon />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton>
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button component="label" variant="contained" startIcon={<CloudUploadIcon />}>
            Upload file
            <VisuallyHiddenInput type="file" ref={setInputRef} onChange={onUpload} />
          </Button>
        </Show>
      </DialogContent>
      <DialogActions>
        <Button type="reset" onClick={props.onCancel}>
          Back
        </Button>
        <Button
          type="submit"
          onClick={() => {
            if (props.modalState === 'upload') {
              props.onSubmit(name(), props.modalState, blob())
            } else {
              props.onSubmit(name(), props.modalState)
            }
          }}
          disabled={name() === '' || (props.modalState === 'upload' && blob().length <= 0)}
          autofocus
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  )
}
