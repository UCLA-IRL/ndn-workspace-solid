import { encodeKey as encodePath, openRoot } from '../../utils'

export class TypedModel<T> {
  constructor(
    readonly storageFolder: string,
    readonly getName: (object: T) => string,
  ) {}

  async save(object: T) {
    const rootHandle = await openRoot()
    const connections = await rootHandle.getDirectoryHandle(this.storageFolder, { create: true })
    const fileHandle = await connections.getFileHandle(encodePath(this.getName(object)), { create: true })
    const textFile = await fileHandle.createWritable()
    await textFile.write(JSON.stringify(object))
    await textFile.close()
  }

  async remove(connName: string) {
    const rootHandle = await openRoot()
    const objects = await rootHandle.getDirectoryHandle(this.storageFolder, {
      create: true,
    })
    try {
      await objects.removeEntry(encodePath(connName), { recursive: true })
      await rootHandle.removeEntry(encodePath(connName), { recursive: true })
    } catch {
      return false
    }
  }

  async isExisting(connName: string) {
    const rootHandle = await openRoot()
    const objects = await rootHandle.getDirectoryHandle(this.storageFolder, {
      create: true,
    })
    try {
      await objects.getFileHandle(encodePath(connName), { create: false })
      return true
    } catch {
      return false
    }
  }

  async load(connName: string) {
    const rootHandle = await openRoot()
    const objects = await rootHandle.getDirectoryHandle(this.storageFolder, {
      create: true,
    })
    try {
      const file = await objects.getFileHandle(encodePath(connName), {
        create: false,
      })
      const jsonFile = await file.getFile()
      const jsonText = await jsonFile.text()
      const object = JSON.parse(jsonText) as T
      return object
    } catch {
      return undefined
    }
  }

  async loadAll() {
    const rootHandle = await openRoot()

    const objects = await rootHandle.getDirectoryHandle(this.storageFolder, {
      create: true,
    })
    const ret: Array<T> = []
    for await (const [, handle] of objects.entries()) {
      if (handle.kind === 'file') {
        const jsonFile = await handle.getFile()
        const jsonText = await jsonFile.text()
        const object = JSON.parse(jsonText) as T
        ret.push(object)
      }
    }

    return ret
  }
}
