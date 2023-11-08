// This file is the main file gluing all components and maintain a global context.
// Should be changed to something better if refactor.
import { Endpoint } from "@ndn/endpoint"
import { Data, Name, Signer, digestSigning } from '@ndn/packet'
import { ControlCommand } from "@ndn/nfdmgmt"
import { FwFace } from "@ndn/fw"
import { WsTransport } from "@ndn/ws-transport"
import { getYjsDoc } from '@syncedstore/core'
import * as Y from 'yjs'
import { NdnSvsAdaptor } from "../adaptors/yjs-ndn-adaptor"
import { PeerJsListener } from '../adaptors/peerjs-transport'
import { CertStorage } from './security/cert-storage'
import { RootDocStore, initRootDoc, project, profiles, connections } from './models'
import { FsStorage, InMemoryStorage, type Storage } from "./storage"
import { SyncAgent } from './sync-agent'
import { Certificate, ECDSA, createSigner } from "@ndn/keychain"
import { v4 as uuidv4 } from "uuid"
import { base64ToBytes, encodeKey as encodePath } from "../utils"
import { Decoder } from "@ndn/tlv"

export const endpoint: Endpoint = new Endpoint()
export type ConnState = 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'DISCONNECTING'

export let bootstrapping = false  // To prevent double click
export let bootstrapped = false
export let persistStore: Storage | undefined
export let certStorage: CertStorage | undefined
export let syncAgent: SyncAgent | undefined
export let appPrefix: Name | undefined
export let nodeId: Name | undefined

export let trustAnchor: Certificate | undefined
export let ownCertificate: Certificate | undefined

// TODO: Decouple backend with frontend. Consider Redux?
// TODO: Separate CRDT document with data packets. Add data storage to store updates from other peers.
// TODO: Setup persistent storage using IndexDB
export let rootDoc: RootDocStore | undefined
export let yjsAdaptor: NdnSvsAdaptor | undefined

export let listener: PeerJsListener | undefined = undefined
export let nfdWsFace: FwFace | undefined = undefined
let connState: ConnState = 'DISCONNECTED'
let nfdCmdSigner: Signer = digestSigning
let commandPrefix = ControlCommand.localhopPrefix

// ============= Connectivity =============

async function connectNfdWs(uri: string, isLocal: boolean) {
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

async function disconnectNfdWs() {
  if (nfdWsFace === undefined) {
    console.error('Try to disconnect from a non-existing WebSocket face')
    return
  }
  nfdWsFace.close()
  nfdWsFace = undefined
}

async function connectPeerJs(opts: PeerJsListener.Options, discovery: boolean) {
  if (listener === undefined) {
    listener = await PeerJsListener.listen(opts)
    if (discovery) {
      await listener.connectToKnownPeers()
    }
  } else {
    console.error('Try to reconnect to an existing PeerJs listener')
  }
}

async function disconnectPeerJs() {
  listener?.closeAll()
  listener = undefined
}

export function connectionStatus() {
  return connState
}

export async function disconnect() {
  if (connState !== 'CONNECTED') {
    return
  }
  connState = 'DISCONNECTING'
  if (listener !== undefined) {
    await disconnectPeerJs()
  }
  if (nfdWsFace !== undefined) {
    await disconnectNfdWs()
  }
  connState = 'DISCONNECTED'
}

export async function connect(config: connections.Config) {
  if (connState !== 'DISCONNECTED') {
    console.error('Dual-homing is not supported. Please start local NFD.')
    return
  }
  connState = 'CONNECTING'

  if (config.kind === 'nfdWs') {

    // Decode command signer
    if (config.prvKeyB64 === '') {
      nfdCmdSigner = digestSigning
    } else {
      try {
        const prvKeyBits = base64ToBytes(config.prvKeyB64)
        const certBytes = base64ToBytes(config.ownCertificateB64)
        const certDecoder = new Decoder(certBytes)
        const ownCertificate = Certificate.fromData(Data.decodeFrom(certDecoder))
        const keyPair = await ECDSA.cryptoGenerate({
          importPkcs8: [prvKeyBits, ownCertificate.publicKeySpki]
        }, true)
        nfdCmdSigner = createSigner(
          ownCertificate.name.getPrefix(ownCertificate.name.length - 2),
          ECDSA,
          keyPair).withKeyLocator(ownCertificate.name)
      } catch (e) {
        console.error('Unable to parse credentials:', e)
        connState = 'DISCONNECTED'
        return
      }
    }

    let face
    try {
      face = await connectNfdWs(config.uri, config.isLocal)
      if (face === undefined) {
        throw new Error('Face is nil')
      }
    } catch (err) {
      console.error('Failed to connect:', err)
      connState = 'DISCONNECTED'
      return
    }
    face!.addEventListener('down', () => {
      disconnectNfdWs()
    })
  } else if (config.kind === 'peerJs') {
    try {
      await connectPeerJs(config, true)
    } catch (err) {
      console.error('Failed to connect:', err)
      connState = 'DISCONNECTED'
      return
    }
  }

  syncAgent?.fire()
  connState = 'CONNECTED'
}

// ============= Bootstrapping =============

export async function bootstrapWorkspace(opts: {
  trustAnchor: Certificate,
  prvKey: Uint8Array,
  ownCertificate: Certificate,
  createNew: boolean,
  inMemory?: boolean,
}) {
  if (bootstrapping) {
    console.error('Bootstrapping in progress or done')
    return
  }
  bootstrapping = true

  trustAnchor = opts.trustAnchor
  ownCertificate = opts.ownCertificate

  // Certificates
  // To switch to persistent storage:
  // TODO: Store YJS document in this storage
  // However, y-indexeddb seems to only replay all stored updates, until it reaches some point and
  // use `encodeStateAsUpdate` to reduce.
  appPrefix = opts.trustAnchor.name.getPrefix(opts.trustAnchor.name.length - 4)
  nodeId = opts.ownCertificate.name.getPrefix(opts.ownCertificate.name.length - 4)

  if (!opts.inMemory && opts.createNew && await isProfileExisting(nodeId.toString())) {
    console.error('Cannot create an existing profile. Will try to join it instead.')
    opts.createNew = false
  }

  if (opts.inMemory) {
    persistStore = new InMemoryStorage()
  } else {
    const handle = await navigator.storage.getDirectory()
    const subFolder = await handle.getDirectoryHandle(encodePath(nodeId.toString()), { create: true })
    persistStore = new FsStorage(subFolder)
  }


  // NOTE: CertStorage does not have a producer to serve certificates. This reuses the SyncAgent's responder.
  // certStore = new InMemoryStorage()
  certStorage = new CertStorage(opts.trustAnchor, opts.ownCertificate, persistStore, endpoint, opts.prvKey)
  await certStorage.readyEvent

  // Sync Agents
  syncAgent = await SyncAgent.create(
    nodeId, persistStore, endpoint, certStorage.signer!, certStorage.verifier,
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
    const mainUuid = uuidv4()
    rootDoc.latex[project.RootId] = {
      id: project.RootId,
      // fullPath: '/',
      name: '',
      parentId: undefined,
      kind: 'folder',
      items: []
    }
    rootDoc.latex[mainUuid] = {
      id: mainUuid,
      // fullPath: '/',
      name: 'main.tex',
      parentId: project.RootId,
      kind: 'text',
      text: new Y.Text(),
    }
    rootDoc.latex[project.RootId].items.push(mainUuid)
    rootDoc.aincraft.items = []
  } else {
    await syncAgent.replayUpdates('doc')
  }

  if (!opts.inMemory) {
    // We need to save profile for both create and join
    await saveProfile(profiles.fromBootParams(opts))
  }

  // Start Sync
  syncAgent.ready = true

  // Mark success
  bootstrapped = true

  // Register prefix if the connection is already there
  await checkPrefixRegistration(false)
}

export async function stopWorkspace() {
  if (!bootstrapped) {
    console.error('No workspace is bootstrapped yet')
    return
  }
  bootstrapped = false

  await checkPrefixRegistration(true)
  nodeId = undefined
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
      name: nodeId!,
      origin: 65,  // client
    }, {
      endpoint: endpoint,
      commandPrefix: commandPrefix,
    })
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
      signer: nfdCmdSigner,
    })
    if (cr.statusCode !== 200) {
      console.error(`Unable to register route: ${cr.statusCode} ${cr.statusText}`);
    }
    const cr2 = await ControlCommand.call("rib/register", {
      name: nodeId!,
      origin: 65,  // client
      cost: 0,
      flags: 0x02,  // CAPTURE
    }, {
      endpoint: endpoint,
      commandPrefix: commandPrefix,
      signer: nfdCmdSigner,
    })
    if (cr2.statusCode !== 200) {
      console.error(`Unable to register route: ${cr2.statusCode} ${cr2.statusText}`);
    }
  }
}

// ============= Profiles =============

export const loadProfiles = profiles.profiles.loadAll.bind(profiles.profiles)
export const saveProfile = profiles.profiles.save.bind(profiles.profiles)
export const removeProfile = profiles.profiles.remove.bind(profiles.profiles)
export const isProfileExisting = profiles.profiles.isExisting.bind(profiles.profiles)

// ============= Connections (init) =============

connections.initDefault()
