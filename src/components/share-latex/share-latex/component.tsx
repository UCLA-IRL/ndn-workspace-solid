import AppTools from '../app-tools'
import FileList from '../file-list'
import LatexDoc from '../latex-doc'
import MarkdownDoc from '../markdown-doc'
import NewItemModal, { FileType } from '../new-item-modal'
import { Button, Paper } from '@suid/material'
import { project } from '../../../backend/models'
import { Accessor, Match, Setter, Show, Switch, createSignal } from 'solid-js'
import RichDoc from '../rich-doc'
import { ViewValues } from '../types'
import PDFViewer from '../simple-pdf/pdf-viewer'
import styles from './styles.module.scss'
import { NdnSvsAdaptor } from '@ucla-irl/ndnts-aux/adaptors'
import RenameItem from '../rename-item'
import { ModalState } from '.'

export default function ShareLatexComponent(props: {
  rootUri: string
  item: project.Item | undefined
  folderChildren: string[] | undefined
  fileType: Accessor<FileType>
  setFileType: Setter<FileType>
  modalState: Accessor<ModalState>
  setModalState: Setter<ModalState>
  pathIds: () => string[]
  resolveItem: (id: string) => project.Item | undefined
  deleteItem: (index: number) => void
  renameItem: (id: string, newName: string) => void
  createItem: (name: string, state: FileType, blob?: Uint8Array) => void
  onExportZip: () => void
  onExportFlatZip: () => void
  onCompile: () => Promise<void>
  onMapFolder: () => Promise<void>
  onMapDetach: () => Promise<void>
  onDownloadBlob: () => void
  view: Accessor<ViewValues>
  setView: Setter<ViewValues>
  compilationLog: string
  pdfUrl: string | undefined
  username: string
  yjsProvider: Accessor<NdnSvsAdaptor | undefined>
}) {
  const [fileId, setFileId] = createSignal('')

  return (
    <>
      <Show when={props.modalState() === 'rename'}>
        <RenameItem
          fileType={props.fileType()}
          fileId={fileId()}
          onCancel={() => {
            props.setModalState('')
            props.setFileType('')
          }}
          onSubmit={props.renameItem}
        />
      </Show>
      <Show when={props.modalState() === 'create'}>
        <NewItemModal
          fileType={props.fileType()}
          onCancel={() => {
            props.setModalState('')
            props.setFileType('')
          }}
          onSubmit={props.createItem}
        />
      </Show>
      <AppTools
        rootPath={props.rootUri}
        pathIds={props.pathIds()}
        resolveName={(id) => props.resolveItem(id)?.name}
        onCompile={props.onCompile}
        view={props.view}
        setView={props.setView}
        menuItems={[
          {
            name: 'New folder',
            onClick: () => {
              props.setFileType('folder')
              props.setModalState('create')
            },
          },
          {
            name: 'New tex',
            onClick: () => {
              props.setFileType('doc')
              props.setModalState('create')
            },
          },
          {
            name: 'New rich doc',
            onClick: () => {
              props.setFileType('richDoc')
              props.setModalState('create')
            },
          },
          {
            name: 'New Markdown doc',
            onClick: () => {
              props.setFileType('markdownDoc')
              props.setModalState('create')
            },
          },
          {
            name: 'Upload blob',
            onClick: () => {
              props.setFileType('upload')
              props.setModalState('create')
            },
          },
          { name: 'divider' },
          { name: 'Download as zip', onClick: props.onExportZip },
          { name: 'Download as flat zip', onClick: props.onExportFlatZip },
          { name: 'Map to a folder', onClick: props.onMapFolder },
          { name: 'Map folder detach', onClick: () => props.onMapDetach() },
        ]}
      />

      <div class={styles.outer}>
        <Show when={props.view() === 'Editor' || props.view() === 'Both'}>
          <div
            class={styles.panel}
            classList={{
              'w-half': props.view() === 'Both',
            }}
          >
            <Switch fallback={<></>}>
              <Match when={props.folderChildren !== undefined}>
                <Paper>
                  <FileList
                    rootUri={props.rootUri}
                    subItems={props.folderChildren!}
                    resolveItem={props.resolveItem}
                    deleteItem={props.deleteItem}
                    renameItem={(id: string) => {
                      setFileId(id)
                      props.setFileType('') // TODO: placeholder, could further divide rename-funcionality based on file types
                      props.setModalState('rename')
                    }}
                  />
                </Paper>
              </Match>
              <Match when={props.item?.kind === 'text'}>
                <LatexDoc
                  doc={(props.item as project.TextDoc).text}
                  subDocId={props.item!.id}
                  provider={props.yjsProvider()!}
                  username={props.username}
                />
              </Match>
              <Match when={props.item?.kind === 'xmldoc'}>
                <RichDoc
                  doc={(props.item as project.XmlDoc).text}
                  subDocId={props.item!.id}
                  provider={props.yjsProvider()!}
                  username={props.username}
                />
              </Match>
              <Match when={props.item?.kind === 'markdowndoc'}>
                <MarkdownDoc
                  doc={(props.item as project.MarkdownDoc).prosemirror}
                  subDocId={props.item!.id}
                  provider={props.yjsProvider()!}
                  username={props.username}
                />
              </Match>
              <Match when={props.item?.kind === 'blob'}>
                <Button onClick={props.onDownloadBlob}>Download</Button>
              </Match>
            </Switch>
          </div>
        </Show>
        <Show when={props.view() === 'PDF' || props.view() === 'Both'}>
          <div
            class={styles.panel}
            classList={{
              'w-half': props.view() === 'Both',
            }}
          >
            <div class={styles.pdf}>
              {props.pdfUrl ? (
                <div>
                  <PDFViewer pdfUrl={props.pdfUrl} />
                </div>
              ) : (
                <div />
              )}
            </div>
          </div>
        </Show>
        <Show when={props.view() === 'Log'}>
          <div class={styles.panel}>
            <pre class={styles.log}>
              <u>
                <b>Compilation Log</b>
              </u>
              <br />
              {props.compilationLog}
            </pre>
          </div>
        </Show>
      </div>
    </>
  )
}
