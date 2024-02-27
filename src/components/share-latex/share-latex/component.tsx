import AppTools from '../app-tools'
import FileList from '../file-list'
import LatexDoc from '../latex-doc'
import NewItemModal, { ModalState } from '../new-item-modal'
import { Button, Paper } from '@suid/material'
import { project } from '../../../backend/models'
import { Accessor, Match, Setter, Show, Switch } from 'solid-js'
import RichDoc from '../rich-doc'
import { ViewValues } from '../types'
import PdfViewer from '../pdf-viewer/pdf-viewer'
import styles from './styles.module.scss'
import { NdnSvsAdaptor } from '@ucla-irl/ndnts-aux/adaptors'

export default function ShareLatexComponent(props: {
  rootUri: string
  item: project.Item | undefined
  folderChildren: string[] | undefined
  modalState: Accessor<ModalState>
  setModalState: Setter<ModalState>
  pathIds: () => string[]
  resolveItem: (id: string) => project.Item | undefined
  deleteItem: (index: number) => void
  createItem: (name: string, state: ModalState, blob?: Uint8Array) => void
  onExportZip: () => void
  onExportFlatZip: () => void
  onCompile: () => Promise<void>
  onMapFolder: () => Promise<void>
  onMapDetach: () => Promise<void>
  onDownloadBlob: () => void
  view: Accessor<ViewValues>
  setView: Setter<ViewValues>
  onArchive: () => Promise<void>
  onRestore: () => Promise<void>
  version: Accessor<number>
  setVersion: Setter<number>
  totalVersion: Accessor<number>
  compilationLog: string
  pdfUrl: string | undefined
  username: string
  yjsProvider: Accessor<NdnSvsAdaptor | undefined>
}) {
  return (
    <>
      <Show when={props.modalState() !== ''}>
        <NewItemModal
          modalState={props.modalState()}
          onCancel={() => props.setModalState('')}
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
        onArchive={props.onArchive}
        onRestore={props.onRestore}
        version={props.version}
        setVersion={props.setVersion}
        totalVersion={props.totalVersion}
        menuItems={[
          { name: 'New folder', onClick: () => props.setModalState('folder') },
          { name: 'New tex', onClick: () => props.setModalState('doc') },
          {
            name: 'New rich doc',
            onClick: () => props.setModalState('richDoc'),
          },
          { name: 'Upload blob', onClick: () => props.setModalState('upload') },
          { name: 'divider' },
          { name: 'Download as zip', onClick: props.onExportZip },
          { name: 'Download as flat zip', onClick: props.onExportFlatZip },
          { name: 'Map to a folder', onClick: props.onMapFolder },
          { name: 'Map folder detach', onClick: () => props.onMapDetach()}
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
            {props.pdfUrl ? <PdfViewer pdfUrl={props.pdfUrl} /> : <div />}
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
