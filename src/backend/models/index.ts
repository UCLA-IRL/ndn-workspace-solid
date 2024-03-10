import { syncedStore } from '@syncedstore/core'
import * as project from './project'
import * as connections from './connections'
import * as profiles from './profiles'
import * as Y from 'yjs'

export { project, connections, profiles }

// create message type for chatbox
export type Message = {
  sender: string
  content: string
  timestamp: number
}

export type RootDocType = {
  latex: project.Items
  chats: Message[]
}
export type RootDocStore = ReturnType<typeof syncedStore<RootDocType>>

export function initRootDoc(guid: string) {
  return syncedStore(
    {
      latex: {},
      chats: [],
    } as RootDocType,
    new Y.Doc({ guid }),
  )
}
