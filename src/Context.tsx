import {
  createSignal, createContext, useContext, onMount,
  type ParentProps, type Accessor,
} from "solid-js"
import { RootDocStore } from "./backend/models"
import { SyncAgent } from "./backend/sync-agent"
import { initEvent, rootDoc, syncAgent } from "./backend/main"

type ContextType = {
  rootDoc: Accessor<RootDocStore | undefined>
  syncAgent: Accessor<SyncAgent | undefined>
}

const NdnWorkspaceContext = createContext<ContextType>()

export function NdnWorkspaceProvider(props: ParentProps<unknown>) {
  const [rootDocSig, setRootDocSig] = createSignal<RootDocStore>()
  const [syncAgentSig, setSyncAgentSig] = createSignal<SyncAgent>()
  const value: ContextType = {
    rootDoc: rootDocSig,
    syncAgent: syncAgentSig,
  }

  onMount(() => {
    initEvent.then(() => {
      setRootDocSig(rootDoc)
      setSyncAgentSig(syncAgent)
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
