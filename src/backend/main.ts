// This file is the main file gluing all components and maintain a global context.
// Should be changed to something better if refactor.
import { Endpoint, Producer } from '@ndn/endpoint'
import { Name } from '@ndn/packet'
import * as nfdmgmt from '@ndn/nfdmgmt'
import { getYjsDoc } from '@syncedstore/core'
import { CertStorage } from '@ucla-irl/ndnts-aux/security'
import { RootDocStore, initRootDoc, project, profiles, connections } from './models'
import { FsStorage, InMemoryStorage, type Storage } from '@ucla-irl/ndnts-aux/storage'
import { Certificate } from '@ndn/keychain'
import { encodeKey as encodePath, Signal as BackendSignal, openRoot } from '../utils'
import { Workspace } from '@ucla-irl/ndnts-aux/workspace'
import toast from 'solid-toast'
import { Connection, NfdWsConn, PeerJsConn, BleConn, TestbedConn, UseAutoAnnouncement } from './connection/mod.ts'

export const endpoint: Endpoint = new Endpoint()
export type ConnState = 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'DISCONNECTING'

export let bootstrapping = false // To prevent double click
// export let bootstrapped = false   // !!workspace
export let persistStore: Storage | undefined
export let certStorage: CertStorage | undefined
export let workspace: Workspace | undefined
export let appPrefix: Name | undefined
export let nodeId: Name | undefined

export let trustAnchor: Certificate | undefined
export let ownCertificate: Certificate | undefined

export let rootDoc: RootDocStore | undefined

const connState = new BackendSignal<ConnState>('DISCONNECTED')
export let connection: Connection | undefined = undefined
let nfdCertProducer: Producer | undefined

// ============= Connectivity =============

export const connectionStatus = () => connState.value
export const connectionStatusSig = () => connState

export async function disconnect() {
  if (connState.value !== 'CONNECTED' || !connection) {
    return
  }

  connState.value = 'DISCONNECTING'
  if (connection.config.kind !== 'peerJs') {
    await checkPrefixRegistration(true)
  }
  await connection.disconnect()
  connection = undefined
  connState.value = 'DISCONNECTED'

  toast.error('Disconnected from forwarder')
}

export async function connect(config: connections.Config) {
  if (connState.value !== 'DISCONNECTED') {
    console.error('Dual-homing is not supported. Please start local NFD.')
    toast.error('Dual-homing is not supported. Please start local NFD.')
    return
  }
  connState.value = 'CONNECTING'

  try {
    if (config.kind === 'nfdWs') {
      connection = new NfdWsConn(config)
    } else if (config.kind === 'peerJs') {
      connection = new PeerJsConn(config)
    } else if (config.kind === 'ble') {
      connection = new BleConn(config)
    } else if (config.kind === 'testbed') {
      connection = new TestbedConn(config)
    } else {
      throw new Error(`Unrecognized connection: ${config}`)
    }
    await connection.connect()
    if (config.kind !== 'peerJs') {
      await checkPrefixRegistration(false)
    }
  } catch (err) {
    console.error('Failed to connect:', err)
    toast.error('Failed to connect, see console for details')
    connection?.disconnect()
    connection = undefined
    connState.value = 'DISCONNECTED'
    return
  }
  connection.face!.addEventListener('down', () => {
    disconnect()
  })

  workspace?.fireUpdate()
  connState.value = 'CONNECTED'

  toast.success('Connected to forwarder successfully!')
}

// ============= Bootstrapping =============

export async function bootstrapWorkspace(opts: {
  trustAnchor: Certificate
  prvKey: Uint8Array
  ownCertificate: Certificate
  inMemory?: boolean
}) {
  if (bootstrapping) {
    console.error('Bootstrapping in progress or done')
    toast.error('Bootstrapping in progress or done')
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

  if (opts.inMemory) {
    persistStore = new InMemoryStorage()
  } else {
    const handle = await openRoot()
    const subFolder = await handle.getDirectoryHandle(encodePath(nodeId.toString()), { create: true })
    persistStore = new FsStorage(subFolder)
  }

  // NOTE: CertStorage does not have a producer to serve certificates. This reuses the SyncAgent's responder.
  // certStore = new InMemoryStorage()
  certStorage = new CertStorage(opts.trustAnchor, opts.ownCertificate, persistStore, endpoint, opts.prvKey)
  await certStorage.readyEvent

  // Root doc using CRDT and Sync
  rootDoc = initRootDoc(project.WorkspaceDocId)

  // Load or create
  const createNewDoc: (() => Promise<void>) | undefined = async () => {
    if (!rootDoc) return
    // Note: in Yjs a nested object (`new Y.Array()`) is fundamentally different from
    // a nested subdoc (`new Y.Doc({guid}) -> ydoc.getArray()`)
    // Because a non-top-level object is fundamentally from a top-level object.
    // syncedstore uses nested object, where non-top objects do not support "smart" initialization.
    // If we go to use a nested document, we need to rewrite the provider to support it.
    // I think eventually we may go this way. But for now, let's take the easiest solution.
    const yDoc = getYjsDoc(rootDoc)
    const clientID = yDoc.clientID
    yDoc.clientID = 1 // Set the client Id to be a common one to make the change common
    rootDoc.latex[project.RootId] = {
      id: project.RootId,
      name: '',
      parentId: undefined,
      kind: 'folder',
      items: [],
    }
    yDoc.clientID = clientID
  }

  workspace = await Workspace.create({
    nodeId,
    persistStore,
    endpoint,
    rootDoc: getYjsDoc(rootDoc),
    signer: certStorage.signer,
    verifier: certStorage.verifier,
    onReset: disconnect,
    createNewDoc,
    useBundler: true,
  })

  if (!opts.inMemory) {
    // We need to save profile for both create and join
    await saveProfile(profiles.fromBootParams(opts))
  }

  // Register prefix if the connection is already there
  await checkPrefixRegistration(false)
}

export async function stopWorkspace() {
  if (!workspace) {
    console.error('No workspace is bootstrapped yet')
    toast.error('No workspace is bootstrapped yet')
    return
  }

  await checkPrefixRegistration(true)
  workspace.destroy()
  workspace = undefined

  nodeId = undefined
  appPrefix = undefined

  rootDoc = undefined
  certStorage = undefined

  persistStore?.close()
  persistStore = undefined

  bootstrapping = false
}

async function checkPrefixRegistration(cancel: boolean) {
  if (!connection || !workspace) {
    return
  }
  if (cancel) {
    if (!UseAutoAnnouncement) {
      // Unregister prefixes
      try {
        await nfdmgmt.invoke(
          'rib/unregister',
          {
            name: nodeId!,
            origin: 65, // client
          },
          {
            endpoint: endpoint,
            prefix: connection.commandPrefix,
            signer: connection.cmdSigner,
          },
        )
        await nfdmgmt.invoke(
          'rib/unregister',
          {
            name: appPrefix!,
            origin: 65, // client
          },
          {
            endpoint: endpoint,
            prefix: connection.commandPrefix,
            signer: connection.cmdSigner,
          },
        )
      } catch {
        // Ignore errors
      }

      // Stop serving certificate
      nfdCertProducer?.close()
      nfdCertProducer = undefined

      toast.success('Unregistered routes successfully!')
    }
  } else {
    // Note: UseAutoAnnouncement works, the following code is kept for test.
    // Differences:
    // - UseAutoAnnouncement does not cut the connection and notify the user when he uses
    //   an invalid certificate to connect to a testbed node.
    // - UseAutoAnnouncement will announce sync prefixes
    if (!UseAutoAnnouncement) {
      // Serve the certificate back to the forwarder
      if (nfdCertProducer) {
        nfdCertProducer?.close()
      }
      if (connection.nfdCert) {
        nfdCertProducer = endpoint.produce(connection.nfdCert.name, async () => connection?.nfdCert?.data)
      }

      // Register prefixes
      try {
        let cr = await nfdmgmt.invoke(
          'rib/register',
          {
            name: appPrefix!,
            origin: 65, // client
            cost: 0,
            flags: 0x02, // CAPTURE
          },
          {
            endpoint: endpoint,
            prefix: connection.commandPrefix,
            signer: connection.cmdSigner,
          },
        )
        if (cr.statusCode !== 200) {
          console.error(`Unable to register route: ${cr.statusCode} ${cr.statusText}`)
          toast.error(`Unable to register route: ${cr.statusCode} ${cr.statusText}`)
          // Cut connection
          return await disconnect()
        }

        cr = await nfdmgmt.invoke(
          'rib/register',
          {
            name: nodeId!,
            origin: 65, // client
            cost: 0,
            flags: 0x02, // CAPTURE
          },
          {
            endpoint: endpoint,
            prefix: connection.commandPrefix,
            signer: connection.cmdSigner,
          },
        )
        if (cr.statusCode !== 200) {
          console.error(`Unable to register route: ${cr.statusCode} ${cr.statusText}`)
          toast.error(`Unable to register route: ${cr.statusCode} ${cr.statusText}`)
          // Cut connection
          return await disconnect()
        }

        toast.success('Registered routes successfully!')
      } catch {
        toast.error(
          'Unable to register route with no response.' +
            "Most likey because your certificate is not allowed to register this workspace's prefix",
        )
        // Cut connection
        return await disconnect()
      }
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
