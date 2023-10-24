import { SyncAgent } from "../backend/sync-agent"
import * as Y from 'yjs'

export class NdnSvsAdaptor {
  private readonly callback = this.docUpdateHandler.bind(this)

  constructor(
    public syncAgent: SyncAgent,
    public readonly doc: Y.Doc,
    public readonly topic: string
  ) {
    syncAgent.register('update', topic, (content) => this.handleSyncUpdate(content))
    doc.on('update', this.callback)
  }

  public destroy() {
    this.syncAgent.unregister('update', this.topic)
    this.doc.off('update', this.callback)
  }

  private docUpdateHandler(update: Uint8Array, origin: undefined) {
    if (origin !== this) {
      this.produce(update)  // No need to await
    }
  }

  private async produce(content: Uint8Array) {
    this.syncAgent.publishUpdate(this.topic, content)
  }

  private async handleSyncUpdate(content: Uint8Array) {
    // Apply patch
    Y.applyUpdate(this.doc, content, this)
  }
}
