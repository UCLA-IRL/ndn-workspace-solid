import * as Y from 'yjs'
import { FileType } from '../new-item-modal'
import { useParams, useNavigate } from '@solidjs/router'
import { project } from '../../../backend/models'
import { createEffect, createSignal, onCleanup } from 'solid-js'
import { observeDeep } from '@syncedstore/core'
import { Interest, Name, digestSigning } from '@ndn/packet'
import { v4 as uuidv4 } from 'uuid'
import { useNdnWorkspace } from '../../../Context'
import { FileMapper } from '../../../backend/file-mapper'
import { createInterval } from '../../../utils'
import ShareLatexComponent from './component'
import { Encoder } from '@ndn/tlv'
import * as segObj from '@ndn/segmented-object'
import { consume } from '@ndn/endpoint'
import { PdfTeXEngine } from '../../../vendor/swiftlatex/PdfTeXEngine'
import { LatexEnginePath } from '../../../constants'
import { ViewValues } from '../types'
import toast from 'solid-toast'

export type ModalState = '' | 'rename' | 'create'

export default function ShareLatex(props: { rootUri: string }) {
  const { rootDoc, syncAgent, booted, fw, yjsProvider } = useNdnWorkspace()!
  const navigate = useNavigate()
  const params = useParams<{ itemId: string }>()
  const itemId = () => params.itemId
  const [item, setItem] = createSignal<project.Item>()
  const [mapper, setMapper] = createSignal<FileMapper>()
  // const [previewUrl, setPreviewUrl] = createSignal<string>()
  const { fileSystemSupported } = useNdnWorkspace()!

  const username = () => {
    const nodeId = syncAgent()?.nodeId
    if (nodeId) {
      return nodeId.at(nodeId.length - 1).text
    } else {
      return ''
    }
  }

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
  const [fileType, setFileType] = createSignal<FileType>('')
  const [modalState, setModalState] = createSignal<ModalState>('')
  const [view, setView] = createSignal<ViewValues>('Editor')
  const [compilationLog, setCompilationLog] = createSignal<string>('')
  const [pdfUrl, setPdfUrl] = createSignal<string>()

  if (!booted()) {
    navigate('/profile', { replace: true })
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
    const rootDocVal = rootDoc()
    if (cur?.kind === 'folder') {
      const curItem = rootDocVal!.latex[cur.items[index]]
      if (curItem !== undefined) {
        curItem!.deleted = true
      }
      cur.items.splice(index, 1)
      // The root document is not modified, so the person editting this file will not be affected.
    }
  }

  const renameItem = (id: string, newName: string) => {
    /* For renaming, we
      1. change the name (not ID) of the original blob
      2. remove and append to cur.items, so that the person editting is not affected */
    const cur = item()
    const rootDocVal = rootDoc()
    if (newName !== '' && cur?.kind === 'folder') {
      // const to = props.rootUri + '/' + newId
      const curItem = rootDocVal!.latex[id]
      const curIdx = cur.items.indexOf(id)

      if (curItem !== undefined) {
        curItem!.name = newName
        cur.items.splice(curIdx, 1)
        cur.items.push(id) // the root document is not modified, so the person editting this file will not be affected.
      }

      // navigate(to, { replace: true })
    }
    setModalState('')
    setFileType('')
  }

  const createItem = (name: string, state: FileType, blob?: Uint8Array) => {
    const cur = item() // Convenient for TS check
    const rootDocVal = rootDoc()
    if (name !== '' && cur?.kind === 'folder') {
      const existId = cur.items.find((obj) => rootDocVal!.latex[obj]?.name === name)
      const newId = existId ?? uuidv4()
      const to = props.rootUri + '/' + newId
      if (state === 'folder') {
        if (existId === undefined) {
          rootDocVal!.latex[newId] = {
            id: newId,
            kind: 'folder',
            // fullPath: cur.fullPath + '/' + name,
            name: name,
            deleted: false,
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
            deleted: false,
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
            deleted: false,
            parentId: cur.id,
            text: new Y.XmlFragment(),
          }
          cur.items.push(newId)
        }
        navigate(to, { replace: true })
      } else if (state === 'markdownDoc') {
        const newName = name.endsWith('.md') ? name : name + '.md'
        if (existId === undefined) {
          rootDocVal!.latex[newId] = {
            id: newId,
            kind: 'markdowndoc',
            // fullPath: cur.fullPath + '/' + name,
            name: newName,
            deleted: false,
            parentId: cur.id,
            prosemirror: new Y.XmlFragment(),
          }
          cur.items.push(newId)
        }
        navigate(to, { replace: true })
      } else if (state === 'upload' && blob !== undefined && blob.length > 0) {
        syncAgent()!
          .publishBlob('latexBlob', blob)
          .then((blobName) => {
            if (existId === undefined) {
              rootDocVal!.latex[newId] = {
                id: newId,
                kind: 'blob',
                // fullPath: cur.fullPath + '/' + name,
                name: name,
                deleted: false,
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
    setFileType('')
    setModalState('')
  }

  const onExportZip = async () => {
    const zip = await project.exportAsZip(async (name) => await syncAgent()?.getBlob(name), rootDoc()!.latex)
    const content = await zip.generateAsync({ type: 'uint8array' })
    const file = new Blob([content], { type: 'application/zip;base64' })
    const fileUrl = URL.createObjectURL(file)
    window.location.assign(fileUrl)
  }

  const onExportFlatZip = async () => {
    const zip = await project.exportFlatZip(async (name) => await syncAgent()?.getBlob(name), rootDoc()!.latex)
    const content = await zip.generateAsync({ type: 'uint8array' })
    const file = new Blob([content], { type: 'application/zip;base64' })
    const fileUrl = URL.createObjectURL(file)
    window.location.assign(fileUrl)
  }

  const [texEngine, setTexEngine] = createSignal<PdfTeXEngine>()

  const onCompile = async () => {
    await toast.promise(
      compile(),
      {
        loading: 'Compiling PDF...',
        success: 'Compiled PDF successfully!',
        error: 'Failed to compile PDF',
      },
      {
        duration: 3000,
        position: 'bottom-right',
      },
    )
  }

  const compile = async () => {
    let engine = texEngine()
    if (!engine) {
      engine = new PdfTeXEngine()
      setTexEngine(engine)
      await engine.loadEngine(LatexEnginePath)
      if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
        // Only set URL in production mode
        engine.setTexliveEndpoint(`${location.origin}/stored/`)
      }
    }

    // Store all files in the WASM filesystem
    await project.walk(
      async (name) => await syncAgent()?.getBlob(name),
      rootDoc()!.latex,
      (path) => engine!.makeMemFSFolder(path),
      (path, item) => engine!.writeMemFSFile(path, item),
    )

    // Compile main.tex
    engine.setEngineMainFile('main.tex')
    let compLog = 'Start compiling ...\n'
    setCompilationLog(compLog)
    const res = await engine.compileLaTeX(async (log) => {
      console.log(log)
      compLog += log + '\n'
      setCompilationLog(compLog)
    })
    compLog += '=============================================\n'
    compLog += res.log
    setCompilationLog(compLog)

    // Check if PDF is generated
    if (!res.pdf) {
      throw new Error('Failed to compile')
    }

    const data: Uint8Array = res.pdf
    const blob = new Blob([data], { type: 'application/pdf' })

    const oldUrl = pdfUrl()
    if (oldUrl) URL.revokeObjectURL(oldUrl)

    const fileUrl = URL.createObjectURL(blob)
    setPdfUrl(fileUrl)
  }

  // Preservec unused
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _onCompileRemote = async () => {
    const agent = syncAgent()
    if (!agent) {
      return
    }
    const zip = await project.exportAsZip(async (name) => await agent.getBlob(name), rootDoc()!.latex)
    const blobFile = await zip.generateAsync({ type: 'uint8array' })

    // TODO: Disable the button when compiling is in progress
    // TODO: Remove this temporary blob after finish (so is the object URL)
    const reqName = await agent.publishBlob('zipToCompile', blobFile, undefined, false)
    const reqNameEncoder = new Encoder()
    reqName.encodeTo(reqNameEncoder)

    const interest = new Interest(
      '/ndn/workspace-compiler/request',
      Interest.MustBeFresh,
      Interest.Lifetime(60000),
      reqNameEncoder.output,
    )
    await digestSigning.sign(interest)
    const retWire = await consume(interest, { fw })
    const retText = new TextDecoder().decode(retWire.content)
    const result = JSON.parse(retText)

    if (result.status === 'error') {
      console.error('Request failed')
      console.log(result.stdout)
      console.log(result.stderr)
    } else {
      console.info('Request finished')
      const reqId = result.id
      const pdfContent = await segObj.fetch(`/ndn/workspace-compiler/result/${reqId}`)
      const file = new Blob([pdfContent], { type: 'application/pdf;base64' })
      const fileUrl = URL.createObjectURL(file)
      window.open(fileUrl)
    }
  }

  const onMapFolder = async () => {
    if (mapper() !== undefined) {
      console.error('Already mapped')
      toast.error('Already mapped to a folder.')
      return
    }
    if (!fileSystemSupported()) {
      console.error('Browser does not support File System Access API. Please use Chrome or Edge 119+.')
      toast.error('Browser does not support File System Access API. Please use Chrome or Edge 119+.')
      return
    }
    let rootHandle
    try {
      rootHandle = await window.showDirectoryPicker({ mode: 'readwrite' })
    } catch (err) {
      console.log('Failed to open target folder: ', err)
      toast.error(`Failed to open target folder: ${err}`)
      return
    }
    const newMapper = new FileMapper(syncAgent()!, rootDoc()!, rootHandle)
    setMapper(newMapper)

    await newMapper.SyncAll()
  }

  const onMapDetach = async () => {
    if (mapper() === undefined) {
      console.error('Not mapped')
      toast.error('Not mapped to a folder.')
      return
    }
    setMapper(undefined)
  }

  createInterval(
    () => {
      if (mapper() === undefined) {
        return
      }
      mapper()?.SyncAll()
    },
    () => 1500,
  )

  createEffect(() => {
    const curRootDoc = rootDoc()
    const curMapper = mapper()
    if (curRootDoc !== undefined && curMapper !== undefined) {
      const cancel = observeDeep(rootDoc()!.latex, () => curMapper.SyncAll())
      onCleanup(cancel)
    }
  })

  const onDownloadBlob = () => {
    ;(async () => {
      const curItem = item()
      if (curItem?.kind === 'blob') {
        try {
          const blobName = new Name(curItem.blobName)
          const blob = await syncAgent()!.getBlob(blobName)
          if (blob !== undefined) {
            const file = new Blob([blob], {
              type: 'application/octet-stream;base64',
            })
            const fileUrl = URL.createObjectURL(file)
            window.open(fileUrl) // TODO: not working on Safari
          }
        } catch (e) {
          console.error(`Unable to fetch blob file: `, e)
          toast.error('Failed to fetch blob file, see console for details')
        }
      }
    })()
  }

  return (
    <ShareLatexComponent
      rootUri={props.rootUri}
      item={item()}
      folderChildren={folderChildren()}
      fileType={fileType}
      setFileType={setFileType}
      modalState={modalState}
      setModalState={setModalState}
      pathIds={pathIds}
      resolveItem={resolveItem}
      deleteItem={deleteItem}
      renameItem={renameItem}
      createItem={createItem}
      onExportZip={onExportZip}
      onExportFlatZip={onExportFlatZip}
      onCompile={onCompile}
      onMapFolder={onMapFolder}
      onMapDetach={onMapDetach}
      onDownloadBlob={onDownloadBlob}
      view={view}
      setView={setView}
      compilationLog={compilationLog()}
      pdfUrl={pdfUrl()}
      username={username()}
      yjsProvider={yjsProvider}
    />
  )
}
