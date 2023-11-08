// The Context component connecting backend and the fronent part.
// Wrap up NDN stuffs into Solid signals.
import {
  createSignal, createContext, useContext,
  type ParentProps, type Accessor,
} from "solid-js"
import { RootDocStore, connections } from "./backend/models"
import { SyncAgent } from "./backend/sync-agent"
import * as main from "./backend/main"
import { type Certificate } from "@ndn/keychain"

type ContextType = {
  rootDoc: Accessor<RootDocStore | undefined>
  syncAgent: Accessor<SyncAgent | undefined>
  booted: Accessor<boolean>
  connectionStatus: Accessor<main.ConnState>
  currentConnConfig: Accessor<connections.Config | undefined>
  connectFuncs: {
    connect: (config: connections.Config) => void,
    disconnect: () => void,
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

  const [connStatus, setConnStatus] = createSignal<main.ConnState>(main.connectionStatus())
  const [connConfig, setConnConfig] = createSignal<connections.Config>()

  // Execute the connection
  const connect = (config: connections.Config) => {
    setConnConfig(config)
    setConnStatus('CONNECTING')
    main.connect(config).then(() => {
      const status = main.connectionStatus()
      setConnStatus(status)
      if (status !== 'CONNECTED') {
        setConnConfig()
      }
    })
  }

  const disconnect = () => {
    setConnStatus('DISCONNECTING')
    setConnConfig()
    main.disconnect().then(() => setConnStatus(main.connectionStatus()))
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
    connectionStatus: connStatus,
    currentConnConfig: connConfig,
    connectFuncs: { connect, disconnect },
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
