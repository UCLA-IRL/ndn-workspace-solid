import { syncedStore, Box } from '@syncedstore/core'
import * as project from './project'
import * as connections from './connections'
import * as profiles from './profiles'
import * as chats from './chats'
import * as Y from 'yjs'

export { project, connections, profiles, chats }

export type RootDocType = {
  latex: project.Items
  chats: Box<chats.Message>[]
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
