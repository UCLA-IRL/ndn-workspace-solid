import { syncedStore } from '@syncedstore/core'
import * as project from './project'
import * as connections from './connections'
import * as profiles from './profiles'
import * as Y from 'yjs'

export { project, connections, profiles }

export type RootDocType = {
  latex: project.Items
}
export type RootDocStore = ReturnType<typeof syncedStore<RootDocType>>

export function initRootDoc(guid: string) {
  return syncedStore(
    {
      latex: {},
    } as RootDocType,
    new Y.Doc({ guid }),
  )
}
