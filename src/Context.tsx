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
import { SyncAgent } from '@ucla-irl/ndnts-aux/sync-agent'
import { NdnSvsAdaptor } from '@ucla-irl/ndnts-aux/adaptors'
import * as main from './backend/main'
import { type Certificate } from '@ndn/keychain'
import { type Theme, type Breakpoint } from '@suid/material/styles'
import type { Forwarder } from '@ndn/fw'
import { loadAll } from './backend/models/connections'
import { Workspace } from '@ucla-irl/ndnts-aux/workspace'

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
    inMemory?: boolean
  }) => Promise<void>
  stopWorkspace: () => Promise<void>
  trustAnchor: () => Certificate | undefined
  ownCertificate: () => Certificate | undefined
  fileSystemSupported: Accessor<boolean>
  theme: Accessor<Theme<Breakpoint> | undefined>
  setTheme: Setter<Theme<Breakpoint> | undefined>
  fw: Forwarder
  yjsProvider: Accessor<NdnSvsAdaptor | undefined>
}

const NdnWorkspaceContext = createContext<ContextType>()

export function NdnWorkspaceProvider(props: ParentProps<unknown>) {
  const [rootDocSig, setRootDocSig] = createSignal<RootDocStore>()
  const [workspaceSig, setWorkspaceSig] = createSignal<Workspace>()
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
    setWorkspaceSig(main.workspace)
    setBooted(true)
  }

  const stopWorkspace = async () => {
    setWorkspaceSig(undefined)
    setRootDocSig(undefined)
    await main.stopWorkspace()
    setBooted(false)
  }

  const value: ContextType = {
    rootDoc: rootDocSig,
    syncAgent: () => workspaceSig()?.syncAgent,
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
    fw: main.forwarder,
    yjsProvider: () => workspaceSig()?.yjsAdaptor,
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

  // Attempt to connect
  const configs = await loadAll()
  for (const config of configs) {
    if (config.kind !== 'testbed') continue
    ctx.connectFuncs.connect(config)
    return
  }
  // for (const config of configs) {
  //   if (config.kind !== 'nfdWs') continue
  // }
}
