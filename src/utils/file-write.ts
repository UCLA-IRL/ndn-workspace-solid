import { v4 as uuidv4 } from "uuid"
import WriteWorker from './file-write-worker?worker'
import { type FileWorkerMessage } from './file-write-worker.ts'

// polyfill createWritable on Safari 16
export const writeFile = (() => {
  if (FileSystemFileHandle.prototype.createWritable !== undefined) {
    // Normal browsers
    return async (handle: FileSystemFileHandle, content: string | Blob | BufferSource) => {
      const writable = await handle.createWritable({ keepExistingData: false })
      await writable.write(content)
      await writable.close()
    }
  } else {
    // Weird Safari
    const worker = new WriteWorker()
    const resolvers: Record<string, () => void> = {}

    worker.onmessage = (ev: MessageEvent<string>) => {
      const resolve = resolvers[ev.data]
      if (resolve !== undefined) {
        delete resolvers[ev.data]
        resolve()
      }
    }

    return async (handle: FileSystemFileHandle, content: string | Blob | ArrayBuffer) => {
      let buf: ArrayBuffer
      if (typeof content === 'string') {
        buf = new TextEncoder().encode(content)
      } else if (content instanceof Blob) {
        buf = await content.arrayBuffer()
      } else {
        buf = content
      }
      const fid = uuidv4()
      const msg: FileWorkerMessage = {
        handle: handle,
        content: buf,
        fid
      }
      return new Promise<void>((resolve) => {
        resolvers[fid] = resolve
        worker.postMessage(msg)
      })
    }
  }
})()
