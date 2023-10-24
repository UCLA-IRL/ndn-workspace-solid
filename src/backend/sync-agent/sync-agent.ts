import { Endpoint } from "@ndn/endpoint"
import { Name, Data, type Interest, type Verifier, Signer } from "@ndn/packet"
import { Decoder, Encoder } from "@ndn/tlv"
import { fetch, DataProducer, makeChunkSource } from "@ndn/segmented-object"
import { v4 as uuidv4 } from "uuid"
import { concatBuffers } from "@ndn/util"
import { AtLeastOnceDelivery, LatestOnlyDelivery, UpdateEvent } from "./deliveries"
import { getNamespace } from "./namespace"
import { InMemoryStorage, Storage } from "./storages"


export type ChannelType = 'update' | 'blob' | 'status'

export class SyncAgent {
  private _ready = false
  readonly listeners: { [key: string]: (content: Uint8Array, id: Name) => void } = {}

  private constructor(
    readonly nodeId: Name,
    readonly appPrefix: Name,
    readonly persistStorage: Storage,
    readonly tempStorage: Storage,
    readonly endpoint: Endpoint,
    readonly signer: Signer,
    readonly verifier: Verifier,
    readonly atLeastOnce: AtLeastOnceDelivery,
    readonly latestOnly: LatestOnlyDelivery
  ) {
    // Serve stored packets
    // TODO: Design a better namespace
    // TODO: Make sure this producer does not conflict with the certificate storage's
    // @ndn/repo/DataStore may be a better choice, but needs more time to write code
    endpoint.produce(appPrefix, interest => {
      return this.serve(interest)
    }, { 
      describe: 'SyncAgent.serve',
      routeCapture: false,
      announcement: appPrefix,
     })
  }

  public destroy() {
    this.atLeastOnce.destroy()
    this.latestOnly.destroy()
  }

  public reset() {
    this.atLeastOnce.reset()
    this.latestOnly.reset()
  }

  public get ready() {
    return this._ready
  }

  public set ready(value: boolean) {
    this._ready = value
    if (value) {
      this.atLeastOnce.start()
      this.latestOnly.start()
    }
  }


  private parseInnerData(content: Uint8Array) {
    try {
      const decoder = new Decoder(content)
      const data = Data.decodeFrom(decoder)
      // We use Data for convenient binary encoding. Currently it is not a fully functional Data packet
      // name = [channel, topic, uuid]
      if (data.name.length !== 3) {
        console.error(`Malformed encapsulated packet: ${data.name}`)
        return undefined
      }
      const channelText = data.name.get(0)!.text
      if (!['update', 'blob', 'status'].find(x => x === channelText)) {
        console.error(`Malformed encapsulated packet: ${data.name}`)
        return undefined
      }
      const channel = channelText as ChannelType
      const topic = data.name.get(1)!.text
      return {
        channel: channel,
        topic: topic,
        content: data.content
      }
    } catch (e) {
      console.error(`Unable to decode encapsulated packet: ${e}`)
      return undefined
    }
  }

  private makeInnerData(channel: ChannelType, topic: string, content: Uint8Array) {
    const data = new Data(
      new Name([channel, topic, uuidv4()]),
      content
    )
    const encoder = new Encoder()
    encoder.encode(data)
    return encoder.output
  }

  private async onUpdate(wire: Uint8Array, id: Name) {
    if (!this._ready) {
      console.error('[SyncAgent] FATAL: NOT READY YET')
    }
    if (wire.length <= 0) {
      // The dummy update to trigger SVS
      return
    }

    // Current version does not remember the state of delivered updates
    // So it is required to register callbacks of all docs before a real update arrives
    const inner = this.parseInnerData(wire)
    if (!inner) {
      // Invalid inner data
      return
    }
    const { channel, topic, content } = inner

    if (channel === 'blob') {
      // Handle segmentation for blob
      this.fetchBlob(content, id)
    }
    // Notify the listener
    const listener = this.listeners[`${channel}.${topic}`]
    if (listener) {
      listener(content, id)
    } else if (channel === 'update') {
      console.error('Execution order violation at SyncAgent:',
        'listeners for update channel must be registered before the first update arrives')
    }
  }

  private async fetchBlob(nameWire: Uint8Array, id: Name) {
    let blobName: Name

    try {
      const decoder = new Decoder(nameWire)
      blobName = Name.decodeFrom(decoder)
      // I don't think the following is a real concern. Need check
      // Current implementation does not pass the check
      // If anyone wants to fix, modify publishBlob()
      // if (!blobName.isPrefixOf(id)) {
      //   throw new Error(`Blob name does not start with node ID: ${blobName}`)
      // }
    } catch (e) {
      console.error(`Invalid blob name ${nameWire}: ${e}`)
      return
    }

    const buffers: Uint8Array[] = []
    try {
      const result = fetch(blobName, { verifier: this.verifier })
      for await (const segment of result) {
        // Cache packets
        // TODO: Check with NDNts maintainer if there is a way to obtain the raw segment wire
        const encoder = new Encoder()
        encoder.encode(segment)
        this.persistStorage.put(segment.name.toString(), encoder.output)

        // Reassemble
        buffers.push(segment.content)
      }
    } catch (e) {
      console.error(`Unable to fetch ${blobName}: ${e}`)
      return
    }
    const blob = concatBuffers(buffers)

    // Save blob (SA getBlob())
    await this.persistStorage.put(blobName.toString(), blob)
  }

  public register(channel: ChannelType, topic: string, handler: (content: Uint8Array, id: Name) => void) {
    this.listeners[`${channel}.${topic}`] = handler
  }

  public unregister(channel: ChannelType, topic: string /*, handler: (content: Uint8Array, id: Name) => void*/) {
    delete this.listeners[`${channel}.${topic}`]
  }

  // getBlob returns either a blob or a segment
  public getBlob(name: Name) {
    // TODO: To avoid waste of space, we may want to do reassembly in this function
    return this.persistStorage.get(name.toString())
    // TODO: Fetch missing blob
  }

  // publishBlob segments and produce a blob object
  // Please make sure the blob's name does not conflict with internal packets' names
  public async publishBlob(topic: string, blobContent: Uint8Array, name?: Name, push: boolean = true) {
    // Put original content (SA getBlob())
    if (name === undefined) {
      name = getNamespace().genBlobName(this.appPrefix)
    }
    await this.persistStorage.put(name.toString(), blobContent)

    // Put segmented packets
    const producer = DataProducer.create(makeChunkSource(blobContent), name, { signer: this.signer })
    for await (const segment of producer.listData()) {
      // TODO: Check with NDNts maintainer if there is a way to obtain the raw segment wire
      // Or maybe the problem disappers after shifting to @ndn/repo/DataStore.
      const encoder = new Encoder()
      encoder.encode(segment)
      this.persistStorage.put(segment.name.toString(), encoder.output)
    }

    if (push) {
      // Publish encoded name
      const encoder = new Encoder()
      name.encodeTo(encoder)
      await this.atLeastOnce.produce(this.makeInnerData('blob', topic, encoder.output))
    }

    return name
  }

  public publishUpdate(topic: string, content: Uint8Array) {
    if (content.length > 6000) {
      console.error(`Too large update for topic ${topic}: ${content.length}. Please use the blob channel.`)
    }
    return this.atLeastOnce.produce(this.makeInnerData('update', topic, content))
  }

  public publishStatus(topic: string, content: Uint8Array) {
    // TODO (future): Do we need to do something else to make it better?
    if (content.length > 6000) {
      console.error(`Too large status for topic ${topic}: ${content.length}. Please use the blob channel.`)
    }
    return this.latestOnly.produce(this.makeInnerData('status', topic, content))
  }

  public getStatus() {
    throw new Error('Not implemented')
  }

  async serve(interest: Interest) {
    const intName = interest.name
    if (intName.length <= this.appPrefix.length + 1) {
      // The name should be at least two components plus app prefix
      return undefined
    }
    if (intName.get(this.appPrefix.length)?.equals(getNamespace().syncKeyword)) {
      // Sync interest should not be answered
      return undefined
    }
    const isLatestOnly = intName.get(intName.length - 2)?.equals(getNamespace().latestOnlyKeyword)
    let wire: Uint8Array | undefined = undefined
    if (isLatestOnly) {
      const key = intName.getPrefix(intName.length - 1).toString()
      wire = await this.tempStorage.get(key)

    } else {
      const key = intName.toString()
      wire = await this.persistStorage.get(key)
    }
    if (wire === undefined) {
      console.warn(`A remote peer is fetching a non-existing object: ${intName.toString()}`)
      return undefined
    }
    try {
      const parser = new Decoder(wire)
      const data = Data.decodeFrom(parser)
      if(isLatestOnly && !data.name.equals(intName)) {
        console.log(`A status with not existing version is requested: ${intName.toString()}`)
        return undefined
      }
      return data
    } catch (e) {
      console.error(`Data in storage is not decodable: ${intName.toString()}`)
      return undefined
    }
  }

  /**
   * Trigger the SVS to fire a Sync Interest
   */
  public fire() {
    this.atLeastOnce.fire()
    this.latestOnly.fire()
  }

  static async create(
    nodeId: Name,
    persistStorage: Storage,
    endpoint: Endpoint,
    signer: Signer,
    verifier: Verifier,
  ) {
    const tempStorage = new InMemoryStorage()
    // Note: we need the signer name to be /[appPrefix]/<nodeId>/KEY/<keyID>
    // TODO: In future we plan to have each device of user named as /[appPrefix]/<nodeId>/<keyID>
    const appPrefix = getNamespace().appPrefixFromNodeId(nodeId)
    // const nodeId = getNamespace().nodeIdFromSigner(signer.name)
    const aloSyncPrefix = appPrefix.append(getNamespace().syncKeyword, getNamespace().atLeastOnceKeyword)
    const lateSyncPrefix = appPrefix.append(getNamespace().syncKeyword, getNamespace().latestOnlyKeyword)
    let resolver: ((event: UpdateEvent) => void) | undefined = undefined
    const onUpdatePromise = new Promise<UpdateEvent>(resolve => resolver = resolve)
    const latestOnly = await LatestOnlyDelivery.create(
      nodeId, endpoint, lateSyncPrefix, signer, verifier, tempStorage, persistStorage, onUpdatePromise)
    const atLeastOnce = await AtLeastOnceDelivery.create(
      nodeId, endpoint, aloSyncPrefix, signer, verifier, persistStorage, onUpdatePromise
    )
    const ret = new SyncAgent(
      nodeId,
      appPrefix,
      persistStorage,
      tempStorage,
      endpoint,
      signer,
      verifier,
      atLeastOnce,
      latestOnly
    )
    resolver!((content, id) => ret.onUpdate(content, id))
    return ret
  }
}
