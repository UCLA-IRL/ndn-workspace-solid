import { observeDeep } from "@syncedstore/core"
import { Accessor, createEffect, createSignal, from, onCleanup } from "solid-js"

export function createSyncedStore<T>(syncedObject: T): Accessor<{ value: T } | undefined> {
  return from<{ value: T }>((set) => {
    if (syncedObject !== undefined) {
      set({ value: syncedObject })
      const cancel = observeDeep(syncedObject, () => {
        // Shallow copy to refresh the signal
        set({ value: syncedObject })
      })
      return cancel
    } else {
      return () => { }
    }
  })
}

export function createSyncedStoreSig<T>(signal: Accessor<T | undefined>): Accessor<{ value: T } | undefined> {
  const [ret, setRet] = createSignal<{ value: T }>()

  createEffect(() => {
    const value: T | undefined = signal()
    if (value !== undefined) {
      setRet({ value })
      const cancel = observeDeep(value, () => {
        // Shallow copy to refresh the signal
        setRet({ value })
      })
      onCleanup(cancel)
    } else {
      setRet(undefined)
    }
  })

  return ret
}
