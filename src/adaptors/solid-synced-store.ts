import { Observer, reactive } from "@reactivedata/reactive"
import { from } from "solid-js"

// Not working as expected
export function createSyncedStore<T>(syncedObject: T) {
  return from<T>((set) => {
    const store = reactive(syncedObject, new Observer(() => {
      //@ts-ignore
      set(store)
    }))

    //@ts-ignore
    set(store)

    return () => {}
  })
}
