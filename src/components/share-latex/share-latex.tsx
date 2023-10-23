import * as Y from 'yjs'
import AppTools from './app-tools'
import FileList from './file-list'
import LatexDoc from './latex-doc'
import NewItemModal, { ModalState } from './new-item-modal'
import { Button } from '@suid/material'
import { useParams, useNavigate } from '@solidjs/router'
import { ProjDoc, ProjFileDesc, ProjFolder, exportAsZip, latexFileAt } from '../../backend/models'
import { Match, Show, Switch, createEffect, createSignal, onCleanup } from 'solid-js'
import { observeDeep } from '@syncedstore/core'
import { Name } from '@ndn/packet'
import { bytesToBase64 } from '../../utils/base64'
import { useNdnWorkspace } from '../../Context'

// TODO: Switch to context instead of using exported variables

export default function ShareLatex(props: {
  rootUri: string
}) {
  const { rootDoc, syncAgent, booted } = useNdnWorkspace()!
  const navigate = useNavigate()
  const params = useParams<{ path: string }>()
  const path = () => params.path
  const pathNames = () => path() ? path().split('/') : []
  const pathUri = () => (path() ? `${props.rootUri}/${path()}` : props.rootUri)
  const [item, setItem] = createSignal<ProjFileDesc>()
  const [folderCopy, setFolderCopy] = createSignal<ProjFolder>()
  const [modalState, setModalState] = createSignal<ModalState>('')

  if (!booted()) {
    navigate('/', { replace: true })
  }

  // TODO: Make modal logic correct
  // TODO: Use UndoManager to handle Undo
  // const content = () => ()

  createEffect(() => {
    const rootDocVal = rootDoc()
    if (rootDocVal !== undefined) {
      setItem(latexFileAt(rootDocVal.latex, pathNames()))
    }
  })

  createEffect(() => {
    const cur = item()
    const curPathNames = pathNames()
    if (cur !== undefined && cur.kind === 'folder') {
      setFolderCopy({ kind: 'folder', name: cur.name, items: cur.items })
      // TODO: Use non-nested data structure to avoid dependencies issue
      const cancel = observeDeep(cur, () => {
        const obj = latexFileAt(rootDoc()!.latex, curPathNames)
        if (obj?.kind === 'folder') {
          // Create a shallow copy to force the page refresh
          setFolderCopy({ kind: 'folder', name: cur.name, items: cur.items })
        } else {
          console.error('What happened?!')
        }
      })
      onCleanup(cancel)
    } else {
      setFolderCopy()
    }
  })

  const createItem = (name: string, state: ModalState, blob?: Uint8Array) => {
    const cur = item()  // Convenient for TS check
    if (name !== '' && cur?.kind === 'folder') {
      if (state === 'folder') {
        const to = pathUri() + '/' + name
        if (cur.items.findIndex(obj => obj.name === name) == -1) {
          cur.items.push({
            kind: 'folder',
            name: name,
            items: []
          })
          navigate(to, { replace: true })
        }
      } else if (state === 'doc') {
        // Cannot do this because there are .bib, .sty, etc.
        // const newName = name.endsWith('.tex') ? name : name + '.tex'
        const to = pathUri() + '/' + name
        if (cur.items.findIndex(obj => obj.name === name) == -1) {
          cur.items.push({
            kind: 'doc',
            name: name,
            text: new Y.Text(),
          })
          navigate(to, { replace: true })
        }
      } else if (state === 'upload' && blob !== undefined && blob.length > 0) {
        if (cur.items.findIndex(obj => obj.name === name) == -1) {
          syncAgent()!.publishBlob('latexBlob', blob).then(blobName => {
            // TODO: support replace existing file
            // TODO: how to handle two files with the same name? Use uuid instead of filenames?
            cur.items.push({
              kind: 'blob',
              name: name,
              blobName: blobName.toString()
            })
          })
        }
      }
    }
    setModalState('')
  }

  const onExportZip = () => {
    exportAsZip(rootDoc()!.latex).then(zip => {
      zip.generateAsync({ type: "base64" }).then(b64File => {
        (window as Window).location = "data:application/zip;base64," + b64File
      })
    })
  }

  const onCompile = () => {
    (async () => {
      const zip = await exportAsZip(rootDoc()!.latex)
      const blobFile = await zip.generateAsync({ type: "blob" })
      const formData = new FormData();
      formData.append("file", new File([blobFile], 'upload.zip', {
        type: 'application/octet-stream',
      }));
      const response = await fetch('http://localhost:6175/zip', {
        method: 'POST',
        body: formData,
      })
      const val = await response.json()
      const reqId: string = val.id
      const status: string = val.status
      if (status === 'success' && reqId) {
        window.open(`http://localhost:6175/result/${reqId}`, "_blank", "noreferrer")
      } else {
        console.log(status)
      }
    })()
  }

  const onDownloadBlob = () => {
    (async () => {
      const curItem = item()
      if (curItem?.kind === 'blob') {
        try {
          const blobName = new Name(curItem.blobName)
          const blob = await syncAgent()!.getBlob(blobName)
          if (blob !== undefined) {
            const b64 = bytesToBase64(blob)
            const win = window as Window
            win.location = "data:application/octet-stream;base64," + b64
          }
        } catch (e) {
          console.error(`Unable to fetch blob file: ${e}`)
        }
      }
    })()
  }

  return (
    <>
      <Show when={modalState() !== ''}>
        <NewItemModal
          modalState={modalState()}
          onCancel={() => setModalState('')}
          onSubmit={createItem}
        />
      </Show>
      <AppTools
        rootPath={props.rootUri}
        pathNames={pathNames()}
        onCompile={onCompile}
        menuItems={[
          { name: 'New folder', onClick: () => setModalState('folder') },
          { name: 'New tex', onClick: () => setModalState('doc') },
          { name: 'Upload blob', onClick: () => setModalState('upload') },
          { name: 'divider' },
          { name: 'Download as zip', onClick: onExportZip },
        ]} />
      <Switch fallback={<></>}>
        <Match when={folderCopy() !== undefined}>
          <FileList
            pathUri={pathUri()}
            folder={folderCopy()!}
          />
        </Match>
        <Match when={item()?.kind === 'doc'}>
          <LatexDoc doc={(item() as ProjDoc).text} />
        </Match>
        <Match when={item()?.kind === 'blob'}>
          <Button onClick={onDownloadBlob}>
            DOWNLOAD
          </Button>
        </Match>
      </Switch>
    </>
  )
}
