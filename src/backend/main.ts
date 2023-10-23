// This file is the main file gluing all components and maintain a global context.
// Should be changed to something better if refactor.
import { Endpoint } from "@ndn/endpoint"
import { Name } from '@ndn/packet'
import { ControlCommand } from "@ndn/nfdmgmt"
import { FwFace } from "@ndn/fw"
import { WsTransport } from "@ndn/ws-transport"
import { getYjsDoc } from '@syncedstore/core'
import { v4 as uuidv4 } from "uuid"
import * as Y from 'yjs'
import { NdnSvsAdaptor } from "../adaptors/yjs-ndn-adaptor"
import { PeerJsListener } from '../adaptors/peerjs-transport'
import { CertStorage } from './cert-storage'
import { RootDocStore, initRootDoc } from './models'
import { InMemoryStorage, SyncAgent } from "./sync-agent"

export const nodeId = '/node-' + Array.from(crypto.getRandomValues(new Uint8Array(4)))
  .map(v => v.toString(16).padStart(2, '0'))
  .join('')
export const appPrefix = '/example/testYjs'

export let initialized = false
export let certStorage: CertStorage
export let endpoint: Endpoint
// TODO: Decouple backend with frontend. Consider Redux?
// TODO: Separate CRDT document with data packets. Add data storage to store updates from other peers.
// TODO: Setup persistent storage using IndexDB
export let rootDocId: string = ''
export let rootDoc: RootDocStore
export let yjsAdaptor: NdnSvsAdaptor
export let persistStore: InMemoryStorage
export let syncAgent: SyncAgent
export let listener: PeerJsListener | undefined = undefined
export let nfdWsFace: FwFace | undefined = undefined

export async function connectNfdWs(uri: string, isLocal: boolean) {
  if (nfdWsFace !== undefined) {
    console.error('Try to connect to an already connected WebSocket face')
    return
  }
  nfdWsFace = await WsTransport.createFace({}, uri)
  let commandPrefix = ControlCommand.localhopPrefix
  if (isLocal) {
    // Force ndnts to register the prefix correctly using localhost
    // SA: https://redmine.named-data.net/projects/nfd/wiki/ScopeControl#local-face
    nfdWsFace.attributes.local = true
    commandPrefix = ControlCommand.localhostPrefix
  }
  // Note: the following code does not work. NDNts seems to only work when producers are created after the face.
  // enableNfdPrefixReg(nfdWsFace)
  // nfdWsFace.addAnnouncement(appPrefix)
  const cr = await ControlCommand.call("rib/register", {
    name: new Name(appPrefix),
    origin: 65,  // client
    cost: 0,
    flags: 0x02,  // CAPTURE
  }, {
    endpoint: endpoint,
    commandPrefix: commandPrefix,
  })
  if (cr.statusCode !== 200) {
    throw new Error(`Unable to register route: ${cr.statusCode} ${cr.statusText}`);
  }
  return nfdWsFace
}

export async function disconnectNfdWs() {
  if (nfdWsFace === undefined) {
    console.error('Try to disconnect from a non-existing WebSocket face')
    return
  }
  nfdWsFace.close()
  nfdWsFace = undefined
}

export async function connectPeerJs(opts: PeerJsListener.Options, discovery: boolean) {
  if (listener === undefined) {
    listener = await PeerJsListener.listen(opts)
    if (discovery) {
      await listener.connectToKnownPeers()
    }
  } else {
    console.error('Try to reconnect to an existing PeerJs listener')
  }
}

export async function disconnectPeerJs() {
  listener?.closeAll()
  listener = undefined
}

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
  // listener = await PeerJsListener.listen(opts)
  // await listener.connectToKnownPeers()

  // Construct an Endpoint on the default Forwarder instance.
  endpoint = new Endpoint()

  // Fetch docId and see if we are the first one
  rootDocId = ''
  // if (listener.faces.length > 0) {
  //   try {
  //     const data = await endpoint.consume(appPrefix + '/docId', {})
  //     rootDocId = fromUtf8(data.content)
  //   } catch (err) {
  //     console.error(`Unable to fetch document ID: ${err}. New document will be created.`)
  //     rootDocId = ''
  //   }
  // } else {
  //   rootDocId = ''
  // }

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
})()
