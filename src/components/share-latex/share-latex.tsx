import * as Y from 'yjs'
import AppTools from './app-tools'
import FileList from './file-list'
import LatexDoc from './latex-doc'
import NewItemModal, { ModalState } from './new-item-modal'
import { Button } from '@suid/material'
import { useParams, useNavigate } from '@solidjs/router'
import { project } from '../../backend/models'
import { Match, Show, Switch, createEffect, createSignal, onCleanup } from 'solid-js'
import { observeDeep } from '@syncedstore/core'
import { Name } from '@ndn/packet'
import { v4 as uuidv4 } from "uuid"
import { useNdnWorkspace } from '../../Context'
import RichDoc from './rich-doc'
import { FileMapper } from '../../backend/file-mapper'
import { createInterval } from '../../utils'
import * as main from "../../backend/main"

export default function ShareLatex(props: {
  rootUri: string
}) {
  const { rootDoc, syncAgent, booted } = useNdnWorkspace()!
  const navigate = useNavigate()
  const params = useParams<{ itemId: string }>()
  const itemId = () => params.itemId
  const [item, setItem] = createSignal<project.Item>()
  const [mapper, setMapper] = createSignal<FileMapper>()
  const { fileSystemSupported } = useNdnWorkspace()!

  const pathIds = (): string[] => {
    const curItem = item()
    const rootDocVal = rootDoc()
    if (rootDocVal !== undefined) {
      const withoutRoot = project.getPaths(rootDocVal.latex, curItem) ?? []
      return [project.RootId, ...withoutRoot]
    } else {
      return []
    }
  }

  const [folderChildren, setFolderChildren] = createSignal<string[]>()
  const [modalState, setModalState] = createSignal<ModalState>('')

  if (!booted()) {
    navigate('/', { replace: true })
  }

  // TODO: Make modal logic correct

  createEffect(() => {
    const rootDocVal = rootDoc()
    if (rootDocVal !== undefined) {
      setItem(rootDocVal.latex[itemId()])
    }
  })

  createEffect(() => {
    const cur = item()
    if (cur !== undefined && cur.kind === 'folder') {
      setFolderChildren([...cur.items])
      const cancel = observeDeep(cur, () => {
        // Shallow copy to force it to rerender
        setFolderChildren([...cur.items])
      })
      onCleanup(cancel)
    } else {
      setFolderChildren()
    }
  })

  const resolveItem = (id: string) => {
    const rootDocVal = rootDoc()
    return rootDocVal?.latex[id]
  }

  const deleteItem = (index: number) => {
    const cur = item()
    if (cur?.kind === 'folder') {
      cur.items.splice(index, 1)
      // The root document is not modified, so the person editting this file will not be affected.
    }
  }

  const createItem = (name: string, state: ModalState, blob?: Uint8Array) => {
    const cur = item()  // Convenient for TS check
    const rootDocVal = rootDoc()
    if (name !== '' && cur?.kind === 'folder') {
      const existId = cur.items.find(obj => rootDocVal!.latex[obj]?.name === name)
      const newId = existId ?? uuidv4()
      const to = props.rootUri + '/' + newId
      if (state === 'folder') {
        if (existId === undefined) {
          rootDocVal!.latex[newId] = {
            id: newId,
            kind: 'folder',
            // fullPath: cur.fullPath + '/' + name,
            name: name,
            parentId: cur.id,
            items: [],
          }
          cur.items.push(newId)
        }
        navigate(to, { replace: true })
      } else if (state === 'doc') {
        // Cannot add the extension automatically because there are .bib, .sty, etc.
        // const newName = name.endsWith('.tex') ? name : name + '.tex'
        if (existId === undefined) {
          rootDocVal!.latex[newId] = {
            id: newId,
            kind: 'text',
            // fullPath: cur.fullPath + '/' + name,
            name: name,
            parentId: cur.id,
            text: new Y.Text(),
          }
          cur.items.push(newId)
        }
        navigate(to, { replace: true })
      } else if (state === 'richDoc') {
        const newName = name.endsWith('.xml') ? name : name + '.xml'
        if (existId === undefined) {
          rootDocVal!.latex[newId] = {
            id: newId,
            kind: 'xmldoc',
            // fullPath: cur.fullPath + '/' + name,
            name: newName,
            parentId: cur.id,
            text: new Y.XmlFragment(),
          }
          cur.items.push(newId)
        }
        navigate(to, { replace: true })
      } else if (state === 'upload' && blob !== undefined && blob.length > 0) {
        syncAgent()!.publishBlob('latexBlob', blob).then(blobName => {
          if (existId === undefined) {
            rootDocVal!.latex[newId] = {
              id: newId,
              kind: 'blob',
              // fullPath: cur.fullPath + '/' + name,
              name: name,
              parentId: cur.id,
              blobName: blobName.toString(),
            }
            cur.items.push(newId)
          } else {
            const existItem = rootDocVal!.latex[existId]
            if (existItem?.kind === 'blob') {
              existItem.blobName = blobName.toString()
            }
          }
        })
      }
    }
    setModalState('')
  }

  const onExportZip = () => {
    project.exportAsZip(
      async name => await syncAgent()?.getBlob(name),
      rootDoc()!.latex,
    ).then(zip => {
      zip.generateAsync({ type: "uint8array" }).then(content => {
        const file = new Blob([content], { type: 'application/zip;base64' })
        const fileUrl = URL.createObjectURL(file)
        window.open(fileUrl)
      })
    })
  }

  const onCompile = async () => {
    const zip = await project.exportAsZip(
      async name => await syncAgent()?.getBlob(name),
      rootDoc()!.latex)
    const blobFile = await zip.generateAsync({ type: "blob" })
    const formData = new FormData()
    formData.append("file", new File([blobFile], 'upload.zip', {
      type: 'application/octet-stream',
    }))
    // TODO: Find a new way to handle compilation. Maybe RICE
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
      console.log(val)
    }
  }

  const onMapFolder = async () => {
    if (mapper() !== undefined) {
      console.error('Already mapped')
      return
    }
    if (!fileSystemSupported()) {
      console.error('Browser does not support File System Access API. Please use Chrome or Edge 119+.')
      return
    }
    let rootHandle
    try {
      rootHandle = await window.showDirectoryPicker({ mode: "readwrite" })
    } catch (err) {
      console.log('Failed to open target folder: ', err)
      return
    }
    const newMapper = new FileMapper(syncAgent()!, rootDoc()!, rootHandle)
    setMapper(newMapper)

    await newMapper.SyncAll()
  }

  createInterval(() => {
    if (mapper() === undefined) {
      return
    }
    mapper()?.SyncAll()
  }, () => 1500)

  createEffect(() => {
    const curRootDoc = rootDoc()
    const curMapper = mapper()
    if (curRootDoc !== undefined && curMapper !== undefined) {
      const cancel = observeDeep(rootDoc()!.latex, () => curMapper.SyncAll())
      onCleanup(cancel)
    }
  })


  const onDownloadBlob = () => {
    (async () => {
      const curItem = item()
      if (curItem?.kind === 'blob') {
        try {
          const blobName = new Name(curItem.blobName)
          const blob = await syncAgent()!.getBlob(blobName)
          if (blob !== undefined) {
            const file = new Blob([blob], { type: 'application/octet-stream;base64' })
            const fileUrl = URL.createObjectURL(file)
            window.open(fileUrl)
          }
        } catch (e) {
          console.error(`Unable to fetch blob file: `, e)
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
        pathIds={pathIds()}
        resolveName={id => resolveItem(id)?.name}
        onCompile={onCompile}
        menuItems={[
          { name: 'New folder', onClick: () => setModalState('folder') },
          { name: 'New tex', onClick: () => setModalState('doc') },
          { name: 'New rich doc', onClick: () => setModalState('richDoc') },
          { name: 'Upload blob', onClick: () => setModalState('upload') },
          { name: 'divider' },
          { name: 'Download as zip', onClick: onExportZip },
          { name: 'Map to a folder', onClick: onMapFolder },
          { name: 'divider' },
          {
            name: 'Force reset', onClick: () => {
              main.syncAgent?.forceReset()
            }
          },
        ]} />
      <Switch fallback={<></>}>
        <Match when={folderChildren() !== undefined}>
          <FileList
            rootUri={props.rootUri}
            subItems={folderChildren()!}
            resolveItem={resolveItem}
            deleteItem={deleteItem}
          />
        </Match>
        <Match when={item()?.kind === 'text'}>
          <LatexDoc doc={(item() as project.TextDoc).text} />
        </Match>
        <Match when={item()?.kind === 'xmldoc'}>
          <RichDoc doc={(item() as project.XmlDoc).text} />
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
