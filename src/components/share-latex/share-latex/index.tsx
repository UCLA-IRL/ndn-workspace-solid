import * as Y from 'yjs'
import { ModalState } from '../new-item-modal'
import { useParams, useNavigate } from '@solidjs/router'
import { project } from '../../../backend/models'
import { createEffect, createSignal, onCleanup } from 'solid-js'
import { observeDeep } from '@syncedstore/core'
import { Interest, Name, digestSigning } from '@ndn/packet'
import { v4 as uuidv4 } from "uuid"
import { useNdnWorkspace } from '../../../Context'
import { FileMapper } from '../../../backend/file-mapper'
import { createInterval } from '../../../utils'
import ShareLatexComponent from './component'
import { Encoder } from '@ndn/tlv'
import * as segObj from '@ndn/segmented-object'
import { PdfTeXEngine } from '../../../vendor/swiftlatex/PdfTeXEngine'

export default function ShareLatex(props: {
  rootUri: string
}) {
  const { rootDoc, syncAgent, booted, endpoint } = useNdnWorkspace()!
  const navigate = useNavigate()
  const params = useParams<{ itemId: string }>()
  const itemId = () => params.itemId
  const [item, setItem] = createSignal<project.Item>()
  const [mapper, setMapper] = createSignal<FileMapper>()
  // const [previewUrl, setPreviewUrl] = createSignal<string>()
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

  const onExportZip = async () => {
    const zip = await project.exportAsZip(
      async name => await syncAgent()?.getBlob(name),
      rootDoc()!.latex,
    )
    const content = await zip.generateAsync({ type: "uint8array" })
    const file = new Blob([content], { type: 'application/zip;base64' })
    const fileUrl = URL.createObjectURL(file)
    window.open(fileUrl)
  }

  const [texEngine, setTexEngine] = createSignal<PdfTeXEngine>()
  const onCompile = async () => {
    let engine = texEngine()
    if (!engine) {
      engine = new PdfTeXEngine()
      setTexEngine(engine)
      await engine.loadEngine()
    }

    // Store all files in the WASM filesystem
    await project.walk(
      async name => await syncAgent()?.getBlob(name),
      rootDoc()!.latex,
      (path) => engine!.makeMemFSFolder(path),
      (path, item) => engine!.writeMemFSFile(path, item),
    )

    // Compile main.tex
    engine.setEngineMainFile("main.tex")
    const res = await engine.compileLaTeX()
    console.log(res.log)

    // Check if PDF is generated
    if (!res.pdf) {
      alert('Failed to compile PDF file')
      console.error(res)
      return
    }

    const data: Uint8Array = res.pdf
    const blob = new Blob([data], { type: 'application/pdf' })

    // Replace PDF preview  -> Open a new window for now.
    // URL.revokeObjectURL(previewUrl()!);
    // setPreviewUrl(URL.createObjectURL(blob))
    const fileUrl = URL.createObjectURL(blob)
    window.open(fileUrl)
  }

  // TODO:
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onCompileServer = async () => {
    const agent = syncAgent()
    if (!agent) {
      return
    }
    const zip = await project.exportAsZip(
      async name => await agent.getBlob(name),
      rootDoc()!.latex)
    const blobFile = await zip.generateAsync({ type: "uint8array" })

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
    const retWire = await endpoint.consume(interest)
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

  return <ShareLatexComponent
    rootUri={props.rootUri}
    item={item()}
    folderChildren={folderChildren()}
    modalState={modalState}
    setModalState={setModalState}
    pathIds={pathIds}
    resolveItem={resolveItem}
    deleteItem={deleteItem}
    createItem={createItem}
    onExportZip={onExportZip}
    onCompile={onCompile}
    onMapFolder={onMapFolder}
    onDownloadBlob={onDownloadBlob}
  />
}
