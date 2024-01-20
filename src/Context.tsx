// The Context component connecting backend and the fronent part.
// Wrap up NDN stuffs into Solid signals.
import {
  createSignal,
  createContext,
  useContext,
  type ParentProps,
  type Accessor,
  createEffect,
  Setter,
} from 'solid-js'
import { RootDocStore, connections } from './backend/models'
import { SyncAgent } from './backend/sync-agent'
import * as main from './backend/main'
import { type Certificate } from '@ndn/keychain'
import { type Theme, type Breakpoint } from '@suid/material/styles'
import { Endpoint } from '@ndn/endpoint'
import { doFch } from './testbed'
import { loadAll } from './backend/models/connections'

type ContextType = {
  rootDoc: Accessor<RootDocStore | undefined>
  syncAgent: Accessor<SyncAgent | undefined>
  booted: Accessor<boolean>
  connectionStatus: Accessor<main.ConnState>
  currentConnConfig: Accessor<connections.Config | undefined>
  connectFuncs: {
    connect: (config: connections.Config) => void
    disconnect: () => void
  }
  bootstrapWorkspace: (opts: {
    trustAnchor: Certificate
    prvKey: Uint8Array
    ownCertificate: Certificate
    createNew: boolean
    inMemory?: boolean
  }) => Promise<void>
  stopWorkspace: () => Promise<void>
  trustAnchor: () => Certificate | undefined
  ownCertificate: () => Certificate | undefined
  fileSystemSupported: Accessor<boolean>
  theme: Accessor<Theme<Breakpoint> | undefined>
  setTheme: Setter<Theme<Breakpoint> | undefined>
  endpoint: Endpoint
}

const NdnWorkspaceContext = createContext<ContextType>()

export function NdnWorkspaceProvider(props: ParentProps<unknown>) {
  const [rootDocSig, setRootDocSig] = createSignal<RootDocStore>()
  const [syncAgentSig, setSyncAgentSig] = createSignal<SyncAgent>()
  const [booted, setBooted] = createSignal(false)
  const [theme, setTheme] = createSignal<Theme<Breakpoint>>()

  const [connStatus, setConnStatus] = createSignal<main.ConnState>(main.connectionStatus())
  const [connConfig, setConnConfig] = createSignal<connections.Config>()
  const [fileSystemSupported] = createSignal(typeof window.showDirectoryPicker === 'function')

  createEffect(() => {
    main.connectionStatusSig().on('update', (newValue) => setConnStatus(newValue))
  })

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

  const bootstrapWorkspace: ContextType['bootstrapWorkspace'] = async (opts) => {
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
    fileSystemSupported: fileSystemSupported,
    theme,
    setTheme,
    endpoint: main.endpoint,
  }

  return <NdnWorkspaceContext.Provider value={value}>{props.children}</NdnWorkspaceContext.Provider>
}

export function useNdnWorkspace() {
  return useContext(NdnWorkspaceContext)
}

export async function initTestbed() {
  const ctx = useNdnWorkspace()
  if (!ctx) throw new Error('NdnWorkspaceContext not initialized')

  if (ctx.connectionStatus() !== 'DISCONNECTED') {
    return // already connected or connecting
  }

  const url = await doFch()
  if (url === null) {
    alert('Failed to connect to the NDN testbed. Please try again later.')
    throw new Error('Failed to connect to testbed.')
  }

  // Attempt to get a config for nfdWs
  const configs = await loadAll()
  for (const config of configs) {
    if (config.kind !== 'nfdWs') continue

    // Found a config, connect to it
    // TODO: make sure this is a testbed forwarder
    // TODO: prefer local forwarders if any configured
    ctx.connectFuncs.connect({
      ...config,
      uri: url.toString(),
    })

    // TODO: break on success only
    // TODO: remove config if connection fails?
    break
  }
}
