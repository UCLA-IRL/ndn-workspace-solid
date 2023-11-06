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
import { RootDocStore, initRootDoc, project } from './models'
import { Profile, profileFromBootParams } from './profile'
import { FsStorage, InMemoryStorage, type Storage } from "./storage"
import { SyncAgent } from './sync-agent'
import { Certificate } from "@ndn/keychain"
import { encodeKey as encodePath } from "./storage/file-system"
import { v4 as uuidv4 } from "uuid"

export const endpoint: Endpoint = new Endpoint()

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
    await saveProfile(profileFromBootParams(opts))
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
      signer: certStorage!.signer,  // TODO: Use a different safebag. Route should be separated from app.
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
      signer: certStorage!.signer,  // TODO: Use a different safebag. Route should be separated from app.
    })
    if (cr2.statusCode !== 200) {
      console.error(`Unable to register route: ${cr2.statusCode} ${cr2.statusText}`);
    }
  }
}

// ============= Profiles =============

export async function loadProfiles() {
  const rootHandle = await navigator.storage.getDirectory()

  // Load profiles
  const profiles = await rootHandle.getDirectoryHandle('profiles', { create: true })
  const ret: Array<Profile> = []
  for await (const [, handle] of profiles.entries()) {
    if (handle instanceof FileSystemFileHandle) {
      const jsonFile = await handle.getFile()
      const jsonText = await jsonFile.text()
      const profile = JSON.parse(jsonText) as Profile
      ret.push(profile)
    }
  }

  return ret
}

export async function saveProfile(profile: Profile) {
  const rootHandle = await navigator.storage.getDirectory()

  const profiles = await rootHandle.getDirectoryHandle('profiles', { create: true })
  const fileHandle = await profiles.getFileHandle(encodePath(profile.nodeId), { create: true })
  const textFile = await fileHandle.createWritable()
  await textFile.write(JSON.stringify(profile))
  await textFile.close()
}

export async function removeProfile(nodeId: string) {
  const rootHandle = await navigator.storage.getDirectory()
  const profiles = await rootHandle.getDirectoryHandle('profiles', { create: true })
  try {
    await profiles.removeEntry(encodePath(nodeId.toString()), { recursive: true })
    await rootHandle.removeEntry(encodePath(nodeId.toString()), { recursive: true })
  } catch {
    return false
  }
}

export async function isProfileExisting(nodeId: string) {
  const rootHandle = await navigator.storage.getDirectory()
  const profiles = await rootHandle.getDirectoryHandle('profiles', { create: true })
  try {
    await profiles.getFileHandle(encodePath(nodeId), { create: false })
    return true
  } catch {
    return false
  }
}
