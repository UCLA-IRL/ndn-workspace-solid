import * as Y from 'yjs'
import { Storage } from '../backend/storage'

const StateKey = 'localState'
const SnapshotKey = 'localSnapshot'

/**
 * YjsStateManager manages updates transported by SyncAgent.
 * It receives and emits updates, encodes and loads local state as updates.
 */
export class YjsStateManager {

  private readonly callback = this.docUpdateHandler.bind(this)
  private counter = 0

  constructor(
    public readonly getState: () => Uint8Array,
    public readonly doc: Y.Doc,
    public readonly storage: Storage,
    public readonly threshold = 50,
  ) {
    doc.on('update', this.callback)
  }

  public destroy() {
    this.saveLocalSnapshot(this.getState())
    this.doc.off('update', this.callback)
  }

  private docUpdateHandler(_update: Uint8Array, origin: undefined) {
    if (origin !== this) {  // This condition must be true
      this.counter += 1
      if (this.counter >= this.threshold) {
        this.saveLocalSnapshot(this.getState())
      }
    } else {
      console.error('[FATAL] YjsStateManager is not supposed to apply updates itself.' +
        'Call the NDN Adaptor instead.')
    }
  }

  /** 
   * Save the current status into a local snapshot.
   * This snapshot includes everyone's update and is not supposed to be published.
   * Public snapshots use a different mechanism.
   * @param state the current SVS state vector
   */
  public async saveLocalSnapshot(state: Uint8Array): Promise<void> {
    this.counter = 0
    const update = Y.encodeStateAsUpdate(this.doc)
    await this.storage.set(SnapshotKey, update)
    await this.storage.set(StateKey, state)
  }

  /**
   * Load from a local snapshot.
   * @param replayer the NdnSvsAdaptor's update function that handles replay.
   * @returns a SVS vector that can be used as a start point for `replayUpdates`.
   */
  public async loadLocalSnapshot(replayer: (update: Uint8Array) => Promise<void>): Promise<Uint8Array | undefined> {
    const state = await this.storage.get(StateKey)
    const snapshot = await this.storage.get(SnapshotKey)
    if (snapshot) {
      await replayer(snapshot)
      return state
    } else {
      return undefined
    }
  }
}
