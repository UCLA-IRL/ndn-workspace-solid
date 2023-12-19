import { SyncAgent } from "../backend/sync-agent"
import * as Y from 'yjs'

/**
 * NDN SVS Provider for Yjs. Wraps update into `SyncAgent`'s `update` channel.
 *
 * @example
 *   import * as Y from 'yjs'
 *   import { WebsocketProvider } from 'yjs-ndn-adaptor'
 *   const doc = new Y.Doc()
 *   const syncAgent = await SyncAgent.create(...)
 *   const provider = new WebsocketProvider(syncAgent, doc, 'doc-topic')
 */
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

  public async handleSyncUpdate(content: Uint8Array) {
    // Apply patch
    // Remark: `applyUpdate` will trigger a transaction after the update is decoded.
    // We can register "beforeTransaction" event and throw an exception there to do access control.
    // The exception is supposed to abort `applyUpdate` and propagated out of this call.
    // This is the way we planned to implement access control.
    // SA: https://docs.yjs.dev/api/y.doc#order-of-events
    // https://github.com/yjs/yjs/blob/fe36ffd122a6f2384293098afd52d2c0025fce2a/src/utils/encoding.js#L384-L384
    // https://github.com/yjs/yjs/blob/fe36ffd122a6f2384293098afd52d2c0025fce2a/src/utils/Transaction.js#L415-L426
    Y.applyUpdate(this.doc, content, this)
  }
}
