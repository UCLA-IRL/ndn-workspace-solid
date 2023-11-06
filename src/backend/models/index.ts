import { syncedStore } from "@syncedstore/core"
import * as project from './project'
import * as calendar from './calendar'
import * as aincraft from './aincraft'

export { project, calendar, aincraft }

export type RootDocType = {
  latex: project.Items
  calendar: calendar.Calendar
  aincraft: aincraft.Aincraft
}
export type RootDocStore = ReturnType<typeof syncedStore<RootDocType>>

export function initRootDoc() {
  return syncedStore({
    calendar: {},
    latex: {},
    aincraft: {},
  } as RootDocType)
}
