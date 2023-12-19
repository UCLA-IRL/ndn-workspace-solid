import AppTools from '../app-tools'
import FileList from '../file-list'
import LatexDoc from '../latex-doc'
import NewItemModal, { ModalState } from '../new-item-modal'
import { Button, TextField } from '@suid/material'
import { project } from '../../../backend/models'
import { Accessor, Match, Setter, Show, Switch } from 'solid-js'
import RichDoc from '../rich-doc'
import { ViewValues } from '../types'
import PdfViewer from '../pdf-viewer'

export default function ShareLatexComponent(
  props: {
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
    onCompile: () => Promise<void>
    onMapFolder: () => Promise<void>
    onDownloadBlob: () => void
    view: Accessor<ViewValues>
    setView: Setter<ViewValues>
    compilationLog: string
    pdfUrl: string | undefined
  }
) {
  return <>
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
      resolveName={id => props.resolveItem(id)?.name}
      onCompile={props.onCompile}
      view={props.view}
      setView={props.setView}
      menuItems={[
        { name: 'New folder', onClick: () => props.setModalState('folder') },
        { name: 'New tex', onClick: () => props.setModalState('doc') },
        { name: 'New rich doc', onClick: () => props.setModalState('richDoc') },
        { name: 'Upload blob', onClick: () => props.setModalState('upload') },
        { name: 'divider' },
        { name: 'Download as zip', onClick: props.onExportZip },
        { name: 'Map to a folder', onClick: props.onMapFolder },
      ]} />

    <div class="sl-outer">
      <Show when={props.view() === 'Editor' || props.view() === 'Both'}>
        <div class="sl-panel" classList={{
          'w-half': props.view() === 'Both'
        }}>
          <Switch fallback={<></>}>
            <Match when={props.folderChildren !== undefined}>
              <FileList
                rootUri={props.rootUri}
                subItems={props.folderChildren!}
                resolveItem={props.resolveItem}
                deleteItem={props.deleteItem}
              />
            </Match>
            <Match when={props.item?.kind === 'text'}>
              <LatexDoc doc={(props.item as project.TextDoc).text} />
            </Match>
            <Match when={props.item?.kind === 'xmldoc'}>
              <RichDoc doc={(props.item as project.XmlDoc).text} />
            </Match>
            <Match when={props.item?.kind === 'blob'}>
              <Button onClick={props.onDownloadBlob}>
                Download
              </Button>
            </Match>
          </Switch>
        </div>
      </Show>
      <Show when={props.view() === 'PDF' || props.view() === 'Both'}>
        <div class="sl-panel" classList={{
          'w-half': props.view() === 'Both'
        }}>
          <PdfViewer pdfUrl={props.pdfUrl} />
        </div>
      </Show>
      <Show when={props.view() === 'Log'}>
        <div class="sl-panel">
          <TextField
            fullWidth
            multiline
            rows={props.compilationLog.split('\n').length}
            // minRows={1}
            label="Compilation Log"
            name="compilation-log"
            type="text"
            inputProps={{
              style: {
                "font-family": '"Roboto Mono", ui-monospace, monospace',
                "white-space": "pre"
              }
            }}
            // disabled={readOnly()}  // disabled not working with multiline
            value={props.compilationLog}
          />
        </div>
      </Show>
    </div>
  </>
}