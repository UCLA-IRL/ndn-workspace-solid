import {
  createSignal, createContext, useContext, onMount,
  type ParentProps, type Accessor, createEffect,
} from "solid-js"
import { RootDocStore } from "./backend/models"
import { SyncAgent } from "./backend/sync-agent"
import * as main from "./backend/main"
import { SetStoreFunction, createStore } from "solid-js/store"

export type ConnState = 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'DISCONNECTING'

export type ConnectionConfig = {
  nfdWs: {
    host: string
    port: number
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
  }
}

const NdnWorkspaceContext = createContext<ContextType>()

export function NdnWorkspaceProvider(props: ParentProps<unknown>) {
  const [rootDocSig, setRootDocSig] = createSignal<RootDocStore>()
  const [syncAgentSig, setSyncAgentSig] = createSignal<SyncAgent>()
  const [booted, setBooted] = createSignal(false)

  const [connections, setConnections] = createStore<ConnectionConfig>({
    nfdWs: {
      host: 'localhost',
      port: 9696,
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
    main.connectNfdWs(
      `ws://${connections.nfdWs.host}:${connections.nfdWs.port}/`,
      ['localhost', '127.0.0.1'].some(v => v === connections.nfdWs.host)
    )
      .then((nfdWsFace) => {
        nfdWsFace?.addEventListener('down', () => {
          disconnNfdWs()
        })
        main.syncAgent?.fire()
        setConnStatus('nfdWs', (): ConnState => 'CONNECTED')
      })
      .catch(() => {
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
    )
      .then(() => {
        main.syncAgent?.fire()
        setConnStatus('peerJs', (): ConnState => 'CONNECTED')
      })
      .catch(() => {
        disconnPeerJs()
      })
  }

  const disconnPeerJs = () => {
    setConnStatus('peerJs', (): ConnState => 'DISCONNECTING')
    main.disconnectPeerJs().then(() => setConnStatus('peerJs', (): ConnState => 'DISCONNECTED'))
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
    }
  }

  onMount(() => {
    main.initEvent.then(() => {
      setRootDocSig(main.rootDoc)
      setSyncAgentSig(main.syncAgent)
    })
  })

  return (
    <NdnWorkspaceContext.Provider value={value}>
      {props.children}
    </NdnWorkspaceContext.Provider>
  )
}

export function useNdnWorkspace() {
  return useContext(NdnWorkspaceContext)
}
