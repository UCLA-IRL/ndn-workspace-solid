// This file is the main file gluing all components and maintain a global context.
// Should be changed to something better if refactor.
import { Endpoint } from "@ndn/endpoint"
import { CertStorage } from './cert-storage'
import { Data, Interest, Name } from '@ndn/packet'
import { PeerJsListener } from '../adaptors/peerjs-transport'
import { fromUtf8, toUtf8 } from '@ndn/util'
import { RootDocStore, initRootDoc } from './models'
import { getYjsDoc } from '@syncedstore/core'
import { NdnSvsAdaptor } from "../adaptors/yjs-ndn-adaptor"
import { v4 as uuidv4 } from "uuid"
import * as Y from 'yjs'
import { InMemoryStorage, SyncAgent } from "./sync-agent"

export const nodeId = '/node-' + Array.from(crypto.getRandomValues(new Uint8Array(4)))
  .map(v => v.toString(16).padStart(2, '0'))
  .join('')
export const appPrefix = '/example/testYjs'
const opts: PeerJsListener.Options = {
  host: "localhost",
  port: 8000,
  path: "/aincraft",
  key: "peerjs",
}

export let initialized = false
export let certStorage: CertStorage
export let listener: PeerJsListener
export let endpoint: Endpoint
// TODO: Decouple backend with frontend. Consider Redux?
// TODO: Separate CRDT document with data packets. Add data storage to store updates from other peers.
// TODO: Setup persistent storage using IndexDB
export let rootDocId: string = ''
export let rootDoc: RootDocStore
export let yjsAdaptor: NdnSvsAdaptor
export let persistStore: InMemoryStorage
export let syncAgent: SyncAgent

export const initEvent = (async () => {
  if (initialized) {
    return
  }
  initialized = true

  // Certificates
  certStorage = new CertStorage(new Name(appPrefix + nodeId))
  await certStorage.readyEvent

  // Create a PeerJs listener.
  //
  // A route for "/" prefix is added automatically.
  // You may customize the route prefixes via addRoutes property in the first argument.
  listener = await PeerJsListener.listen(opts)
  await listener.connectToKnownPeers()

  // Construct an Endpoint on the default Forwarder instance.
  endpoint = new Endpoint()

  // Fetch docId and see if we are the first one
  if (listener.faces.length > 0) {
    try {
      const data = await endpoint.consume(appPrefix + '/docId', {})
      rootDocId = fromUtf8(data.content)
    } catch (err) {
      console.error(`Unable to fetch document ID: ${err}. New document will be created.`)
      rootDocId = ''
    }
  } else {
    rootDocId = ''
  }

  // Sync agent
  persistStore = new InMemoryStorage()
  syncAgent = await SyncAgent.create(persistStore, endpoint, certStorage.signer!, certStorage)


  // Root doc using CRDT and Sync
  rootDoc = initRootDoc()
  yjsAdaptor = new NdnSvsAdaptor(
    syncAgent,
    getYjsDoc(rootDoc),
    'latex'
  )

  // Load or create
  if (rootDocId) {
    console.log(`Loaded document: ${rootDocId}`)
  } else {
    rootDocId = uuidv4()
    console.log(`Created document: ${rootDocId}`)
    rootDoc.latex.root = {
      kind: 'folder',
      name: 'ROOT',
      items: []
    }
    rootDoc.latex.root.items.push({
      kind: 'doc',
      name: 'main.tex',
      text: new Y.Text(),
    })
    rootDoc.aincraft.items = []
  }

  // Start Sync
  syncAgent.ready = true

  syncAgent.atLeastOnce.syncInst?.addEventListener('debug', (event) => {
    console.log(event.detail)
  })

  // Help others know docId
  endpoint.produce(appPrefix + '/docId', docIdServer, { describe: 'dataHandler' })
})()


async function docIdServer(interest: Interest) {
  const name = interest.name.toString()
  const content = toUtf8(rootDocId ?? '')
  console.log(`Responded with docId = ${content}`)
  const data = new Data(
    name,
    Data.FreshnessPeriod(60000),
    content,
  )
  return data
}

export function shutdown() {
  listener.closeAll()
}
