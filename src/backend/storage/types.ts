
// SA: https://github.com/azu/kvs/blob/master/packages/types/src/index.ts
export interface Storage {
  /**
   * Look up the value associated to the key.
   * @param key The key to look up
   * @returns The value associated to the key. `undefined` if the key does not exist.
   */
  get(key: string): Promise<Uint8Array | undefined>

  /**
   * Sets the value for the key in the storage.
   * Replace existing value.
   * @param key The key to look up
   * @param value The new value. `undefined` to remove the key.
   */
  set(key: string, value: Uint8Array | undefined): Promise<void>

  /**
   * Check if a key exists
   * @param key The key to look up
   * @returns `true` if the key exists in the storage. `false` otherwise.
   */
  has(key: string): Promise<boolean>

  /**
   * Remove a key-value pair from the storage.
   * @param key The key to look up
   * @returns `true` if the key in the storage existed and has been removed. `false` otherwise.
   */
  delete(key: string): Promise<boolean>

  /**
   * Removes all key-value pairs from the storage.
   */
  clear(): Promise<void>

  /**
   * Close the connection
   */
  close(): Promise<void>
}
