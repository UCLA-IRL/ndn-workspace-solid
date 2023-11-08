import { Storage } from "./types"
import { encodeKey } from "../../utils"

/**
 * A storage based on [File System API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API).
 * Need polyfill for Firefox since it does not support `showDirectoryPicker`,
 * which is one preferred way to obtain a `FileSystemDirectoryHandle`.
 */
export class FsStorage implements Storage {
  /**
   * Create an FsStorage instance.
   * @param root The handle of target folder. Must be writable. Obtained by
   * ```typescript
   * const handle1 = await window.showDirectoryPicker({ mode: "readwrite" })
   * const handle2 = await navigator.storage.getDirectory()  // OPFS
   * ```
   */
  constructor(public readonly root: FileSystemDirectoryHandle) { }

  async get(key: string): Promise<Uint8Array | undefined> {
    const fileName = encodeKey(key)
    try {
      const handle = await this.root.getFileHandle(fileName)
      const file = await handle.getFile()
      return new Uint8Array(await file.arrayBuffer())
    } catch {
      return undefined
    }
  }

  async set(key: string, value: Uint8Array | undefined): Promise<void> {
    const fileName = encodeKey(key)
    if (value !== undefined) {
      const handle = await this.root.getFileHandle(fileName, { create: true })
      const writable = await handle.createWritable({ keepExistingData: false })
      await writable.write(value)
      await writable.close()
    } else {
      try {
        await this.root.removeEntry(fileName)
      } catch { /**/ }
    }
  }

  async has(key: string): Promise<boolean> {
    const fileName = encodeKey(key)
    try {
      await this.root.getFileHandle(fileName)
      return true
    } catch {
      return false
    }
  }

  async delete(key: string): Promise<boolean> {
    const fileName = encodeKey(key)
    try {
      await this.root.removeEntry(fileName)
      return true
    } catch {
      return false
    }
  }

  async clear(): Promise<void> {
    for await (const [fileName] of this.root.entries()) {
      this.root.removeEntry(fileName)
    }
  }

  async close(): Promise<void> { }
}
