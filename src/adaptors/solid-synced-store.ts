import { Observer, reactive } from "@reactivedata/reactive"
import { Setter, from } from "solid-js"

export function createSyncedStore<T>(syncedObject: T) {
  let set: Setter<T | undefined> | undefined
  const observer = new Observer(() => {
    if (set) {
      set(() => store)
    }
  })
  const store = reactive(syncedObject, observer)

  return from<T>((newSet) => {
    set = newSet

    return () => {
      set = undefined
    }
  })
}
