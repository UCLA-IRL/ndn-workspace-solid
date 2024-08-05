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

// NOTE: Please refer to src/backend/models/project.ts:Item.kind
// Should we use that type? Will create more coupling, though
export type FileType = '' | 'folder' | 'doc' | 'upload' | 'richDoc' | 'markdownDoc'

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
  fileType: FileType
  onSubmit: (name: string, state: FileType, blob?: Uint8Array) => void
  onCancel: () => void
}) {
  const [name, setName] = createSignal('')
  const [inputRef, setInputRef] = createSignal<HTMLInputElement>()
  const [fileName, setFileName] = createSignal('')
  const [blob, setBlob] = createSignal(new Uint8Array())
  const title = () => {
    switch (props.fileType) {
      case 'folder':
        return 'New folder'
      case 'doc':
        return 'New .tex file'
      case 'richDoc':
        return 'New .xml rich document'
      case 'upload':
        return 'Upload blob file'
      case 'markdownDoc':
        return 'New .md document'
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
    <Dialog open={props.fileType !== ''}>
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
        <Show when={props.fileType === 'upload'}>
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
            if (props.fileType === 'upload') {
              props.onSubmit(name(), props.fileType, blob())
            } else {
              props.onSubmit(name(), props.fileType)
            }
          }}
          disabled={name() === '' || (props.fileType === 'upload' && blob().length <= 0)}
          autofocus
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  )
}
