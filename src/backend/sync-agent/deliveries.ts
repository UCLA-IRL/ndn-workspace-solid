import { type Endpoint } from "@ndn/endpoint"
import { SvSync, type SyncNode, type SyncUpdate } from "@ndn/sync"
import { type Name, Data, digestSigning, type Verifier, Signer } from "@ndn/packet"
import { SequenceNum } from "@ndn/naming-convention2"
import { Decoder, Encoder } from "@ndn/tlv"
import { SvStateVector } from "@ndn/sync"
import { getNamespace } from "./namespace"
import { Storage } from "./storages"

export function encodeSyncState(state: SvStateVector): Uint8Array {
  const encoder = new Encoder()
  state.encodeTo(encoder)
  return encoder.output
}

export function parseSyncState(vector: Uint8Array): SvStateVector {
  try {
    const decoder = new Decoder(vector)
    const ret = SvStateVector.decodeFrom(decoder)
    return ret
  } catch (e) {
    console.error(`Unable to parse SvStateVector: ${e}`)
    return new SvStateVector()
  }
}

export type UpdateEvent = (content: Uint8Array, id: Name, instance: SyncDelivery) => Promise<void>

// SyncDelivery is a SVS Sync instance associated with a storage.
// It handles update notification and production, but does not serve Data packets.
export abstract class SyncDelivery {
  readonly baseName: Name
  protected _syncInst?: SvSync
  protected _syncNode?: SyncNode
  protected _ready: boolean = false
  protected _startPromise: Promise<void>
  protected _onUpdate?: UpdateEvent
  private _startPromiseResolve?: () => void

  constructor(
    readonly nodeId: Name,
    readonly endpoint: Endpoint,
    readonly syncPrefix: Name,
    readonly signer: Signer,
    readonly verifier: Verifier,
    onUpdatePromise: Promise<UpdateEvent>,
    protected state?: SvStateVector,
  ) {
    // const nodeId = getNamespace().nodeIdFromSigner(this.signer.name)
    this.baseName = getNamespace().baseName(nodeId, syncPrefix)
    this._startPromise = new Promise(resolve => {
      this._startPromiseResolve = resolve
      if (this._ready) {
        resolve()
      }
    })

    SvSync.create({
      endpoint: endpoint,
      syncPrefix: syncPrefix,
      signer: digestSigning,
      initialStateVector: new SvStateVector(state),
      initialize: async (svSync) => {
        this._syncInst = svSync
        this._syncInst.addEventListener("update", update => this.handleSyncUpdate(update))
        this._syncNode = this._syncInst.add(nodeId)
        this._onUpdate = await onUpdatePromise
        await this._startPromise
      }
    }).then(value => {
      // Force triggering the SvSync to fire
      // NOTE: NDNts does not expose a way to trigger the SVS manually
      (value as any).resetTimer(true)
    })
  }

  public get ready() {
    return this._ready
  }

  public get syncInst() {
    return this._syncInst
  }

  public get syncNode() {
    return this._syncNode
  }

  public get onUpdate() {
    return this._onUpdate
  }

  start() {
    if (!this._ready) {
      this._ready = true
      if (this._startPromiseResolve !== undefined) {
        this._startPromiseResolve()
      }
    }
  }

  destroy(storage?: Storage) {
    if (this._syncInst !== undefined) {
      this._syncInst.close()
      if (storage !== undefined) {
        this.storeSyncState(storage)
      }
    } else {
      throw new Error('Current implementation does not support destroy before start.')
    }
  }

  reset() {
    if (this._syncInst === undefined || !this._ready) {
      throw new Error('Please do not reset before start.')
    }
    console.warn('A Sync reset is scheduled.')
    this._syncInst.close()
    this._syncNode = undefined
    return new Promise(r => setTimeout(r, 600000)).then(() => {
      SvSync.create({
        endpoint: this.endpoint,
        syncPrefix: this.syncPrefix,
        signer: digestSigning,
        initialStateVector: new SvStateVector(this.state),
        initialize: async (svSync) => {
          this._syncInst = svSync
          this._syncInst.addEventListener("update", update => this.handleSyncUpdate(update))
          // const nodeId = getNamespace().nodeIdFromSigner(this.signer.name)
          this._syncNode = this._syncInst.add(this.nodeId)
          // this._ready should already be true
        }
      }).then(value => {
        // Force trigger the SvSync to fire
        (value as any).resetTimer(true)
      })
    })
  }

  public fire() {
    if (this._syncInst !== undefined && this._ready) {
      (this._syncInst as any).resetTimer(true)
    }
  }

  protected async setSyncState(nodeId: Name, seq: number, storage?: Storage) {
    if (this.state !== undefined) {
      this.state.set(nodeId, seq)
      if (storage !== undefined) {
        this.storeSyncState(storage)
      }
    }
  }

  protected async storeSyncState(storage: Storage) {
    if (this.state !== undefined) {
      storage.put(
        getNamespace().syncStateKey(this.baseName),
        encodeSyncState(this.state))
    }
  }

  get seqNum() {
    return this.syncNode!.seqNum
  }

  // get nodeId() {
  //   return this.syncNode!.id
  // }

  abstract handleSyncUpdate(update: SyncUpdate<Name>): Promise<void>

  abstract produce(content: Uint8Array): Promise<void>
}

// At least once delivery (closer to exactly once). Used for Y.Doc updates and large blob.
// This class does not handle segmentation.
// Note: storage is not necessarily a real storage.
export class AtLeastOnceDelivery extends SyncDelivery {
  constructor(
    readonly nodeId: Name,
    readonly endpoint: Endpoint,
    readonly syncPrefix: Name,
    readonly signer: Signer,
    readonly verifier: Verifier,
    readonly storage: Storage,
    onUpdatePromise: Promise<UpdateEvent>,
    protected state?: SvStateVector,
  ) {
    super(nodeId, endpoint, syncPrefix, signer, verifier, onUpdatePromise, state)
  }

  override async handleSyncUpdate(update: SyncUpdate<Name>) {
    const prefix = getNamespace().baseName(update.id, this.syncPrefix)
    let lastHandled = update.loSeqNum - 1
    for (let i = update.loSeqNum; i <= update.hiSeqNum; i++) {
      const name = prefix.append(SequenceNum.create(i))
      try {
        const data = await this.endpoint.consume(name, {
          verifier: this.verifier,
          // retx: 3
        })

        // Put into storage
        await this.storage.put(name.toString(), data.content)

        // Callback
        // AtLeastOnce is required to have the callback acknowledged
        // before writing the new SvStateVector into the storage
        await this._onUpdate!(data.content, update.id, this)

        // Mark as persist
        lastHandled = i
      } catch (error) {
        // TODO: Find a better way to handle this
        console.error(`Unable to fetch or verify ${name.toString()} due to: ${error}`)
        console.warn('The current SVS protocol cannot recover from this error. A reset is scheduled in 10 min.')
        this.reset()
        return
      }
    }
    // Putting this out of the loop makes it not exactly once:
    // If the application is down before all messages in the update is handled,
    // some may be redelivered the next time the application starts.
    // Sinc Yjs allows an update to be applied multiple times, this should be fine. 
    await this.setSyncState(update.id, lastHandled, this.storage)
  }

  override async produce(content: Uint8Array) {
    if (this.syncNode === undefined) {
      throw new Error('[AtLeastOnceDelivery] Cannot produce before sync starts')
    }
    // REQUIRE ATOMIC {
    const seqNum = this.syncNode.seqNum + 1
    this.syncNode.seqNum = seqNum  // This line must be called immediately to prevent race condition
    // }
    const name = this.baseName.append(SequenceNum.create(seqNum))
    const data = new Data(
      name,
      Data.FreshnessPeriod(60000),
      content,
    )
    await this.signer.sign(data)

    const encoder = new Encoder()
    encoder.encode(data)
    this.storage.put(name.toString(), encoder.output)

    // Save my own state to prevent reuse the sync number
    if (this.state!.get(this.syncNode.id) < seqNum) {
      this.setSyncState(this.syncNode.id, seqNum, this.storage)
    }
  }

  static async create(
    nodeId: Name,
    endpoint: Endpoint,
    syncPrefix: Name,
    signer: Signer,
    verifier: Verifier,
    storage: Storage,
    onUpdatePromise: Promise<UpdateEvent>,
  ) {
    // const nodeId = getNamespace().nodeIdFromSigner(signer.name)
    const baseName = getNamespace().baseName(nodeId, syncPrefix)
    const encoded = await storage.get(getNamespace().syncStateKey(baseName))
    let syncState = new SvStateVector()
    if (encoded) {
      syncState = parseSyncState(encoded)
    }
    return new AtLeastOnceDelivery(nodeId, endpoint, syncPrefix, signer, verifier, storage, onUpdatePromise, syncState)
  }

  override destroy() {
    return super.destroy(this.storage)
  }
}

// Latest only delivery. Used for status and awareness.
// This delivery does not persists anything.
export class LatestOnlyDelivery extends SyncDelivery {
  constructor(
    readonly nodeId: Name,
    readonly endpoint: Endpoint,
    readonly syncPrefix: Name,
    readonly signer: Signer,
    readonly verifier: Verifier,
    readonly pktStorage: Storage,
    readonly stateStorage: Storage,
    readonly onUpdatePromise: Promise<UpdateEvent>,
    protected state?: SvStateVector,
  ) {
    super(nodeId, endpoint, syncPrefix, signer, verifier, onUpdatePromise, state)
  }

  override async handleSyncUpdate(update: SyncUpdate<Name>) {
    const prefix = getNamespace().baseName(update.id, this.syncPrefix)
    const name = prefix.append(SequenceNum.create(update.hiSeqNum))
    try {
      const data = await this.endpoint.consume(name, { verifier: this.verifier })

      // Update the storage
      // Note that this will overwrite old data
      // TODO: How to serve?
      this.pktStorage.put(getNamespace().latestOnlyKey(name), data.content)

      // Save Sync state
      await this.setSyncState(update.id, update.hiSeqNum, this.stateStorage)

      // Callback
      // LatestOnlyDelivery does not need to wait for this callback
      this._onUpdate!(data.content, update.id, this)
    } catch (error) {
      console.error(`Unable to fetch or verify ${name.toString()} due to: ${error}`)
    }
  }

  override async produce(content: Uint8Array) {
    if (this.syncNode === undefined) {
      throw new Error('[AtLeastOnceDelivery] Cannot produce before sync starts')
    }
    // REQUIRE ATOMIC {
    const seqNum = this.syncNode.seqNum + 1
    this.syncNode.seqNum = seqNum  // This line must be called immediately to prevent race condition
    // }
    const name = this.baseName.append(SequenceNum.create(seqNum))
    const data = new Data(
      name,
      Data.FreshnessPeriod(60000),
      content,
    )
    await this.signer.sign(data)

    const encoder = new Encoder()
    encoder.encode(data)
    this.pktStorage.put(getNamespace().latestOnlyKey(name), encoder.output)

    // Save my own state to prevent reuse the sync number
    if (this.state!.get(this.syncNode.id) < seqNum) {
      this.setSyncState(this.syncNode.id, seqNum, this.stateStorage)
    }
  }

  static async create(
    nodeId: Name,
    endpoint: Endpoint,
    syncPrefix: Name,
    signer: Signer,
    verifier: Verifier,
    pktStorage: Storage,
    stateStorage: Storage,
    onUpdatePromise: Promise<UpdateEvent>,
  ) {
    // Load state is still required to avoid sequence number conflict
    // const nodeId = getNamespace().nodeIdFromSigner(signer.name)
    const baseName = getNamespace().baseName(nodeId, syncPrefix)
    const encoded = await stateStorage.get(getNamespace().syncStateKey(baseName))
    let syncState = new SvStateVector()
    if (encoded) {
      syncState = parseSyncState(encoded)
    }
    return new LatestOnlyDelivery(
      nodeId, endpoint, syncPrefix, signer, verifier, pktStorage, stateStorage, onUpdatePromise, syncState
    )
  }

  override destroy() {
    return super.destroy(this.stateStorage)
  }
}
