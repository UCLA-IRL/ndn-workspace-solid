// This file is the main file gluing all components and maintain a global context.
// Should be changed to something better if refactor.
import { Producer, produce, consume } from '@ndn/endpoint'
import { Name, Interest } from '@ndn/packet'
import * as nfdmgmt from '@ndn/nfdmgmt'
import { getYjsDoc } from '@syncedstore/core'
import * as Y from 'yjs'
import { CertStorage } from '@ucla-irl/ndnts-aux/security'
import { RootDocStore, initRootDoc, project, profiles, connections } from './models'
import { FsStorage, InMemoryStorage, type Storage } from '@ucla-irl/ndnts-aux/storage'
import { Certificate } from '@ndn/keychain'
import { encodeKey as encodePath, Signal as BackendSignal, openRoot } from '../utils'
import { Workspace } from '@ucla-irl/ndnts-aux/workspace'
import { hashFnv32a } from '@ucla-irl/ndnts-aux/utils'
import toast from 'solid-toast'
import { Connection, NfdWsConn, PeerJsConn, BleConn, TestbedConn, UseAutoAnnouncement } from './connection/mod.ts'
import { Forwarder } from '@ndn/fw'
import { fetch } from '@ndn/segmented-object'
import { StateVector } from '@ndn/svs'
import { Decoder, Encoder, NNI } from '@ndn/tlv'

export const forwarder: Forwarder = Forwarder.getDefault()
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

  connection.face?.removeEventListener('down', reconnect)

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

  // Reconnect and initialize when ws breaks, but keep the
  // face around. This means the application does not see any change.
  connection.face?.addEventListener('down', reconnect)

  workspace?.fireUpdate()
  connState.value = 'CONNECTED'

  toast.success('Connected to forwarder successfully!')
}

async function reconnect() {
  toast.promise(
    new Promise<void>((resolve, reject) => {
      connection?.face?.addEventListener(
        'up',
        async () => {
          try {
            if (!(await checkPrefixRegistration(false))) {
              throw new Error('Failed to register prefixes')
            }
            resolve()
          } catch (e) {
            reject(e)
          }
        },
        { once: true },
      )
      connection?.face?.addEventListener('close', () => reject(), { once: true })
    }),
    {
      loading: 'Disconnected from forwarding, attempting to reconnect ...',
      success: () => 'Reconnected to forwarder!',
      error: 'Failed to reconnect to forwarder',
    },
  )
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
    // This is due to JSR failed to handle [Symbol.dispose] properly.
    persistStore = new InMemoryStorage() as unknown as Storage
  } else {
    const handle = await openRoot()
    const subFolder = await handle.getDirectoryHandle(encodePath(nodeId.toString()), { create: true })
    persistStore = new FsStorage(subFolder) as unknown as Storage
  }

  // NOTE: CertStorage does not have a producer to serve certificates. This reuses the SyncAgent's responder.
  // certStore = new InMemoryStorage()
  certStorage = new CertStorage(opts.trustAnchor, opts.ownCertificate, persistStore, forwarder, opts.prvKey)
  await certStorage.readyEvent

  // Root doc using CRDT and Sync
  rootDoc = initRootDoc(project.WorkspaceDocId)
  const yDoc = getYjsDoc(rootDoc)

  // Hash node ID to Yjs client ID
  // To make sure we don't break things, let's do this in the workspace App first before we change
  // the aux Lib.
  const clientID = hashFnv32a(nodeId.toString())

  // Load or create
  const createNewDoc: (() => Promise<void>) | undefined = async () => {
    if (!rootDoc) return
    // Note: in Yjs a nested object (`new Y.Array()`) is fundamentally different from
    // a nested subdoc (`new Y.Doc({guid}) -> ydoc.getArray()`)
    // Because a non-top-level object is fundamentally from a top-level object.
    // syncedstore uses nested object, where non-top objects do not support "smart" initialization.
    // If we go to use a nested document, we need to rewrite the provider to support it.
    // I think eventually we may go this way. But for now, let's take the easiest solution.
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

  // const appPrefixName = appPrefix.toString()
  const snapshotTopic = 'snapshot'
  const snapshotName = appPrefix.append('32=' + snapshotTopic).toString()
  const localYJSUpdate = await persistStore.get('localSnapshot')

  const localTimestamp = await persistStore.get('snapshotTimestamp')

  const timestampInterval = 900000 //15min //86400000 //24hr
  if (!localYJSUpdate || !localTimestamp || Date.now() - NNI.decode(localTimestamp) > timestampInterval) {
    const interest = new Interest(snapshotName, Interest.CanBePrefix, Interest.MustBeFresh)
    try {
      const data = await consume(interest)
      const targetName = data.name.getPrefix(-1)
      // /grpPrefix/32=snapshot/54=<vector>/
      let snapshotData = await fetch(targetName, {
        verifier: certStorage.verifier, // we have access to the verifier
        modifyInterest: { mustBeFresh: true },
        lifetimeAfterRto: 2000,
        retxLimit: 150, // See Deliveries. 60*1000/(2*200)=150. Default minRto = 150.
      })

      // If existing and loading snapshot, merge the contents.
      if (localYJSUpdate) {
        const tempDoc = new Y.Doc()
        Y.applyUpdate(tempDoc, localYJSUpdate)
        Y.applyUpdate(tempDoc, snapshotData)
        snapshotData = Y.encodeStateAsUpdate(tempDoc)
      }
      // If no merge, load the snapshot data as-is.
      await persistStore.set('localSnapshot', snapshotData)

      // State Vector Merge
      // Extract state vector from the snapshot
      const aloSyncKey = '/8=local' + nodeId.toString() + '/32=sync/32=alo/8=syncVector'
      // TODO: SVS parsing check TLV type. Currently assumed as /54=, using ".value" to extract the encoded state vector
      let targetSVEncoded = targetName.at(-1).value

      // Merge targetSV with local YJS state vector, then save to local YJS save
      const localYjsSVEncoded = await persistStore.get('localState')
      let mergedYjsSVEncoded = targetSVEncoded //default case
      if (localYjsSVEncoded) {
        const localYjsSV = Decoder.decode(localYjsSVEncoded, StateVector)
        const targetSV = Decoder.decode(targetSVEncoded, StateVector)
        targetSV.mergeFrom(localYjsSV)
        mergedYjsSVEncoded = Encoder.encode(targetSV)
      }
      await persistStore.set('localState', mergedYjsSVEncoded)

      // Merge the SV with the local ALO one so that when SyncAgent starts up,
      // it replays the local updates (in local storage), starting from snapshot's vector.
      const localAloSVEncoded = await persistStore.get(aloSyncKey)
      if (localAloSVEncoded) {
        const localAloSV = Decoder.decode(localAloSVEncoded, StateVector)
        const targetSV = Decoder.decode(targetSVEncoded, StateVector)
        targetSV.mergeFrom(localAloSV)
        targetSVEncoded = Encoder.encode(targetSV)
      }
      await persistStore.set(aloSyncKey, targetSVEncoded)
    } catch (err) {
      console.warn(err)
      console.log('Aborting snapshot retrieval, falling back to SVS')
    }
  }
  // timestamp update
  await persistStore.set('snapshotTimestamp', Encoder.encode(NNI(Date.now())))

  workspace = await Workspace.create({
    nodeId,
    persistStore,
    fw: forwarder,
    rootDoc: yDoc,
    signer: certStorage.signer,
    verifier: certStorage.verifier,
    onReset: disconnect,
    createNewDoc,
    useBundler: true,
  })
  // Need to do this after local changes are loaded, due to Yjs limitation.
  yDoc.clientID = clientID

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

async function checkPrefixRegistration(cancel: boolean): Promise<boolean> {
  if (!connection?.face?.running || !workspace) {
    return false
  }

  if (UseAutoAnnouncement) {
    return true
  }

  if (cancel) {
    // Unregister prefixes
    try {
      await nfdmgmt.invoke(
        'rib/unregister',
        {
          name: nodeId!,
          origin: 65, // client
        },
        {
          cOpts: {
            fw: forwarder,
          },
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
          cOpts: {
            fw: forwarder,
          },
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
    return true
  } else {
    // Note: UseAutoAnnouncement works, the following code is kept for test.
    // Differences:
    // - UseAutoAnnouncement does not cut the connection and notify the user when he uses
    //   an invalid certificate to connect to a testbed node.
    // - UseAutoAnnouncement will announce sync prefixes

    // Serve the certificate back to the forwarder
    if (nfdCertProducer) {
      nfdCertProducer?.close()
    }
    if (connection.nfdCert) {
      nfdCertProducer = produce(connection.nfdCert.name, async () => connection?.nfdCert?.data, { fw: forwarder })
    }

    const bail = async (cr: nfdmgmt.ControlResponse) => {
      console.error(`Unable to register route: ${cr.statusCode} ${cr.statusText}`)
      toast.error(`Unable to register route: ${cr.statusCode} ${cr.statusText}`)
      await disconnect() // cut connection
      return false
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
          cOpts: {
            fw: forwarder,
          },
          prefix: connection.commandPrefix,
          signer: connection.cmdSigner,
        },
      )
      if (cr.statusCode !== 200) return bail(cr)

      cr = await nfdmgmt.invoke(
        'rib/register',
        {
          name: nodeId!,
          origin: 65, // client
          cost: 0,
          flags: 0x02, // CAPTURE
        },
        {
          cOpts: {
            fw: forwarder,
          },
          prefix: connection.commandPrefix,
          signer: connection.cmdSigner,
        },
      )
      if (cr.statusCode !== 200) return bail(cr)

      toast.success('Registered routes successfully!')
      return true
    } catch (e) {
      // This probably happens because the Interest expired, rather
      // than an explicit failure. Log and retry infinitely.
      // If the connection disconnects during a retry, this function
      // will exit immediately.
      console.error(e)
      return checkPrefixRegistration(cancel)
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
