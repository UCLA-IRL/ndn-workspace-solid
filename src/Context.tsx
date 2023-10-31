// The Context component connecting backend and the fronent part.
// Wrap up NDN stuffs into Solid signals.
import {
  createSignal, createContext, useContext,
  type ParentProps, type Accessor,
} from "solid-js"
import { RootDocStore } from "./backend/models"
import { SyncAgent } from "./backend/sync-agent"
import * as main from "./backend/main"
import { SetStoreFunction, createStore } from "solid-js/store"
import { type Certificate } from "@ndn/keychain"

export type ConnState = 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'DISCONNECTING'

export type ConnectionConfig = {
  nfdWs: {
    uri: string
  },
  peerJs: {
    host: string,
    port: number,
    path: string,
    key: string,
    discovery: boolean,
  }
}

export type ConnectionStatus = {
  nfdWs: ConnState,
  peerJs: ConnState
}

type ContextType = {
  rootDoc: Accessor<RootDocStore | undefined>
  syncAgent: Accessor<SyncAgent | undefined>
  booted: Accessor<boolean>
  connectionSetting: [ConnectionConfig, SetStoreFunction<ConnectionConfig>]
  connectionStatus: ConnectionStatus
  connectFuncs: {
    nfdWs: [() => void, () => void],
    peerJs: [() => void, () => void],
  },
  bootstrapWorkspace: (opts: {
    trustAnchor: Certificate,
    prvKey: Uint8Array,
    ownCertificate: Certificate,
    createNew: boolean,
    inMemory?: boolean,
  }) => Promise<void>,
  stopWorkspace: () => Promise<void>,
  trustAnchor: () => Certificate | undefined,
  ownCertificate: () => Certificate | undefined,
}

const NdnWorkspaceContext = createContext<ContextType>()

export function NdnWorkspaceProvider(props: ParentProps<unknown>) {
  const [rootDocSig, setRootDocSig] = createSignal<RootDocStore>()
  const [syncAgentSig, setSyncAgentSig] = createSignal<SyncAgent>()
  const [booted, setBooted] = createSignal(false)

  const [connections, setConnections] = createStore<ConnectionConfig>({
    nfdWs: {
      uri: 'ws://localhost:9696/',
    },
    peerJs: {
      host: "localhost",
      port: 8000,
      path: "/aincraft",
      key: "peerjs",
      discovery: true,
    }
  })
  const [connStatus, setConnStatus] = createStore<ConnectionStatus>({
    nfdWs: 'DISCONNECTED',
    peerJs: 'DISCONNECTED',
  })

  // Execute the connection
  const connNfdWs = () => {
    setConnStatus('nfdWs', (): ConnState => 'CONNECTING')
    let uri = connections.nfdWs.uri
    if (!uri.endsWith('/')) {
      uri += '/'
    }
    const hostname = new URL(uri).hostname
    main.connectNfdWs(
      uri,
      ['localhost', '127.0.0.1'].some(v => v === hostname)
    ).then((nfdWsFace) => {
      nfdWsFace?.addEventListener('down', () => {
        disconnNfdWs()
      })
      main.syncAgent?.fire()
      setConnStatus('nfdWs', (): ConnState => 'CONNECTED')
    }).catch(() => {
      disconnNfdWs()
    })
  }

  const disconnNfdWs = () => {
    setConnStatus('nfdWs', (): ConnState => 'DISCONNECTING')
    main.disconnectNfdWs().then(() => setConnStatus('nfdWs', (): ConnState => 'DISCONNECTED'))
  }

  const connPeerJs = () => {
    setConnStatus('peerJs', (): ConnState => 'CONNECTING')
    main.connectPeerJs(
      connections.peerJs,
      connections.peerJs.discovery,
    ).then(() => {
      main.syncAgent?.fire()
      setConnStatus('peerJs', (): ConnState => 'CONNECTED')
    }).catch(() => {
      disconnPeerJs()
    })
  }

  const disconnPeerJs = () => {
    setConnStatus('peerJs', (): ConnState => 'DISCONNECTING')
    main.disconnectPeerJs().then(() => setConnStatus('peerJs', (): ConnState => 'DISCONNECTED'))
  }

  const bootstrapWorkspace: ContextType['bootstrapWorkspace'] = async opts => {
    await main.bootstrapWorkspace(opts)
    setRootDocSig(main.rootDoc)
    setSyncAgentSig(main.syncAgent)
    setBooted(true)
  }

  const stopWorkspace = async () => {
    setSyncAgentSig(undefined)
    setRootDocSig(undefined)
    await main.stopWorkspace()
    setBooted(false)
  }

  const value: ContextType = {
    rootDoc: rootDocSig,
    syncAgent: syncAgentSig,
    booted: booted,
    connectionSetting: [connections, setConnections],
    connectionStatus: connStatus,
    connectFuncs: {
      nfdWs: [connNfdWs, disconnNfdWs],
      peerJs: [connPeerJs, disconnPeerJs],
    },
    bootstrapWorkspace: bootstrapWorkspace,
    stopWorkspace: stopWorkspace,
    trustAnchor: () => {
      return main.trustAnchor
    },
    ownCertificate: () => main.ownCertificate,
  }

  return (
    <NdnWorkspaceContext.Provider value={value}>
      {props.children}
    </NdnWorkspaceContext.Provider>
  )
}

export function useNdnWorkspace() {
  return useContext(NdnWorkspaceContext)
}
