// This file is the main file gluing all components and maintain a global context.
// Should be changed to something better if refactor.
import { Endpoint } from "@ndn/endpoint"
import { Name } from '@ndn/packet'
import { ControlCommand } from "@ndn/nfdmgmt"
import { FwFace } from "@ndn/fw"
import { WsTransport } from "@ndn/ws-transport"
import { getYjsDoc } from '@syncedstore/core'
import * as Y from 'yjs'
import { NdnSvsAdaptor } from "../adaptors/yjs-ndn-adaptor"
import { PeerJsListener } from '../adaptors/peerjs-transport'
import { CertStorage } from './security/cert-storage'
import { RootDocStore, initRootDoc } from './models'
import { FsStorage, InMemoryStorage, type Storage } from "./storage"
import { SyncAgent } from './sync-agent'
import { Certificate } from "@ndn/keychain"

export const endpoint: Endpoint = new Endpoint()

export let bootstrapping = false  // To prevent double click
export let bootstrapped = false
export let persistStore: Storage | undefined
export let certStorage: CertStorage | undefined
export let syncAgent: SyncAgent | undefined
export let appPrefix: Name | undefined

export let trustAnchor: Certificate | undefined
export let ownCertificate: Certificate | undefined

// TODO: Decouple backend with frontend. Consider Redux?
// TODO: Separate CRDT document with data packets. Add data storage to store updates from other peers.
// TODO: Setup persistent storage using IndexDB
export let rootDoc: RootDocStore | undefined
export let yjsAdaptor: NdnSvsAdaptor | undefined

export let listener: PeerJsListener | undefined = undefined
export let nfdWsFace: FwFace | undefined = undefined
let commandPrefix = ControlCommand.localhopPrefix

// ============= Connectivity =============

export async function connectNfdWs(uri: string, isLocal: boolean) {
  if (nfdWsFace !== undefined) {
    console.error('Try to connect to an already connected WebSocket face')
    return
  }
  nfdWsFace = await WsTransport.createFace({}, uri)
  commandPrefix = ControlCommand.localhopPrefix
  if (isLocal) {
    // Force ndnts to register the prefix correctly using localhost
    // SA: https://redmine.named-data.net/projects/nfd/wiki/ScopeControl#local-face
    nfdWsFace.attributes.local = true
    commandPrefix = ControlCommand.localhostPrefix
  }
  // Note: the following code does not work. NDNts seems to only work when producers are created after the face.
  // enableNfdPrefixReg(nfdWsFace)
  // nfdWsFace.addAnnouncement(appPrefix)
  await checkPrefixRegistration(false)
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

// ============= Bootstrapping =============

export async function bootstrapWorkspace(opts: {
  trustAnchor: Certificate,
  prvKey: Uint8Array,
  ownCertificate: Certificate,
  createNew: boolean,
}) {
  if (bootstrapping) {
    console.error('Bootstrapping in progress or done')
    return
  }
  bootstrapping = true

  trustAnchor = opts.trustAnchor
  ownCertificate = opts.ownCertificate

  // Certificates
  persistStore = new InMemoryStorage()
  // To switch to persistent storage:
  // TODO: Store YJS document in this storage
  // However, y-indexeddb seems to only replay all stored updates, until it reaches some point and
  // use `encodeStateAsUpdate` to reduce.
  // const handle = await navigator.storage.getDirectory() 
  // persistStore = new FsStorage(handle)

  // NOTE: CertStorage does not have a producer to serve certificates. This reuses the SyncAgent's responder.
  // certStore = new InMemoryStorage()
  certStorage = new CertStorage(opts.trustAnchor, opts.ownCertificate, persistStore, endpoint, opts.prvKey)
  await certStorage.readyEvent

  // Sync Agents
  syncAgent = await SyncAgent.create(
    opts.ownCertificate.name.getPrefix(opts.ownCertificate.name.length - 4),
    persistStore, endpoint, certStorage.signer!, certStorage.verifier,
  )

  // Root doc using CRDT and Sync
  rootDoc = initRootDoc()
  yjsAdaptor = new NdnSvsAdaptor(
    syncAgent,
    getYjsDoc(rootDoc),
    'doc'
  )

  // Load or create
  if (opts.createNew) {
    console.log(`Created document`)
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

  // Register prefix if the connection is already there
  appPrefix = opts.trustAnchor.name.getPrefix(opts.trustAnchor.name.length - 4)
  await checkPrefixRegistration(false)

  // Mark success
  bootstrapped = true
}

export async function stopWorkspace() {
  if (!bootstrapped) {
    console.error('No workspace is bootstrapped yet')
    return
  }
  bootstrapped = false

  await checkPrefixRegistration(true)
  appPrefix = undefined

  syncAgent!.ready = false

  yjsAdaptor!.destroy()
  yjsAdaptor = undefined

  syncAgent!.destroy()
  syncAgent = undefined

  rootDoc = undefined
  certStorage = undefined

  persistStore?.close()
  persistStore = undefined

  bootstrapping = false
}

async function checkPrefixRegistration(cancel: boolean) {
  if (cancel && nfdWsFace !== undefined) {
    await ControlCommand.call("rib/unregister", {
      name: appPrefix!,
      origin: 65,  // client
    }, {
      endpoint: endpoint,
      commandPrefix: commandPrefix,
    })
  } else if (!cancel && nfdWsFace !== undefined && bootstrapped) {
    const cr = await ControlCommand.call("rib/register", {
      name: appPrefix!,
      origin: 65,  // client
      cost: 0,
      flags: 0x02,  // CAPTURE
    }, {
      endpoint: endpoint,
      commandPrefix: commandPrefix,
    })
    if (cr.statusCode !== 200) {
      console.error(`Unable to register route: ${cr.statusCode} ${cr.statusText}`);
    }
  }
}
