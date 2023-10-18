import * as Y from 'yjs'
import AppTools from './app-tools'
import FileList from './file-list'
import LatexDoc from './latex-doc'
import NewItemModal from './new-item-modal'
import { Typography } from '@suid/material'
import { useParams, useNavigate } from '@solidjs/router'
import { initEvent, rootDoc } from '../../backend/main'
import { ProjDoc, ProjFileDesc, ProjFolder, exportAsZip, latexFileAt } from '../../backend/models'
import { Match, Switch, createEffect, createSignal } from 'solid-js'
import { observeDeep } from '@syncedstore/core'

type ModalState = '' | 'folder' | 'doc' | 'upload'

export default function ShareLatex(props: {
  rootUri: string
}) {
  const navigate = useNavigate()
  const params = useParams<{ path: string }>()
  const path = () => params.path
  const pathNames = () => path() ? path().split('/') : []
  const pathUri = () => (path() ? `${props.rootUri}/${path()}` : props.rootUri)
  const [item, setItem] = createSignal<ProjFileDesc>()
  const [folderCopy, setFolderCopy] = createSignal<ProjFolder>()
  const [modalState, setModalState] = createSignal<ModalState>('')

  // TODO: Refresh after folder change. Note that useSyncedStore may cause unnecessary rerenser. Need investigate.
  // TODO: Make modal logic correct
  // TODO: Use UndoManager to handle Undo
  // const content = () => ()

  createEffect(() => {
    const curPathNames = pathNames()  // Explicitly trigger the dependency
    initEvent.then(() => {
      setItem(latexFileAt(rootDoc.latex, curPathNames))
    })
  })

  createEffect(() => {
    const cur = item()
    const curPathNames = pathNames()
    if (cur !== undefined && cur.kind === 'folder') {
      setFolderCopy({ kind: 'folder', name: cur.name, items: cur.items })
      return observeDeep(cur, () => {
        const obj = latexFileAt(rootDoc.latex, curPathNames)
        if (obj?.kind === 'folder') {
          // Create a shallow copy to force the page refresh
          setFolderCopy({ kind: 'folder', name: cur.name, items: cur.items })
        } else {
          console.error('What happened?!')
        }
      })
    }
  })

  const createItem = (name: string) => {
    const cur = item()  // Convenient for TS check
    if (name !== '' && cur?.kind === 'folder') {
      if (modalState() === 'folder') {
        const to = pathUri() + '/' + name
        if (cur.items.findIndex(obj => obj.name === name) == -1) {
          cur.items.push({
            kind: 'folder',
            name: name,
            items: []
          })
          navigate(to, { replace: true })
        }
      } else if (modalState() === 'doc') {
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
      }
    }
    setModalState('')
  }

  const onExportZip = () => {
    const zip = exportAsZip(rootDoc.latex)
    zip.generateAsync({ type: "base64" }).then(b64File => {
      (window as Window).location = "data:application/zip;base64," + b64File
    })
  }

  const onCompile = () => {
    (async () => {
      const zip = exportAsZip(rootDoc.latex)
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

  return (
    <>
      <NewItemModal
        visible={modalState() === 'folder' || modalState() === 'doc'}
        title={modalState() === 'folder' ? 'New folder' : 'New .tex file'}
        onCancel={() => setModalState('')}
        onSubmit={createItem}
      />
      <AppTools
        rootPath={props.rootUri}
        pathNames={pathNames()}
        onCompile={onCompile}
        menuItems={[
          { name: 'New folder', onClick: () => setModalState('folder') },
          { name: 'New tex', onClick: () => setModalState('doc') },
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
          <Typography variant='button' color='error'>
            TODO: Not implemented for kind blob
          </Typography>
        </Match>
      </Switch>
    </>
  )
}
