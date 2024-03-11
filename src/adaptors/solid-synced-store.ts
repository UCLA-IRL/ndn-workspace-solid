import { observeDeep } from '@syncedstore/core'
import { Accessor, createEffect, createSignal, from, onCleanup } from 'solid-js'

/**
 * Solid hook to export a subobject of the store as a signal.
 * Immitate the official `useSyncedStore`.
 *
 * @example
 *
 * // Store setup:
 * const globalStore = SyncedStore({ people: [] })
 * globalStore.people.push({ name: "Alice" })
 * globalStore.people.push({ name: "Bob" })
 *
 * // In your component:
 * const people = createSyncedStore(globalStore.people)
 * <div>{people()![1].name}</div>
 *
 * @param syncedObject The subobject to sync on
 * @returns a signal tracking the subobject
 */
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
      return () => {}
    }
  })
}

/**
 * Solid hook to export a subobject of the store as a signal.
 * Created from another signal.
 *
 * @example
 *
 * // Store setup:
 * const globalStore = SyncedStore({ people: [] })
 * const [storeSig, setStoreSig] = createSignal(globalStore)
 * globalStore.people.push({ name: "Alice" })
 * globalStore.people.push({ name: "Bob" })
 *
 * // In your component:
 * const peopleSig = () => storeSig()?.people  // non-tracking
 * const people = createSyncedStore(peopleSig) // tracking
 * <div>{people()?.value[1].name}</div>
 *
 * @param syncedObject The subobject to sync on
 * @returns a signal tracking the subobject
 */
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
