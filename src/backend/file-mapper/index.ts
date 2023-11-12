// Ref: https://github.com/motifland/yfs
import { getDeltaOperations } from './diff'
import * as project from '../models/project'
import { SyncAgent } from '../sync-agent'

type LastWriteCacheData = {
  lastModified: number
}

export class FileMapper {
  private caches: { [id: string]: LastWriteCacheData } = {}
  readonly syncAgent: SyncAgent

  async UpdateYDocContent(item: project.Item, fileObj: File) {
    if (item.kind === 'xmldoc') {
      // ignore XML docs
      return
    } else if (item.kind === 'blob') {
      // Update version
      const arrBuf = await fileObj.arrayBuffer()
      const buf = new Uint8Array(arrBuf)
      const blobName = await this.syncAgent.publishBlob('latexBlob', buf)
      item.blobName = blobName.toString()
      this.caches[item.id].lastModified = fileObj.lastModified
    } else if (item.kind === 'text') {
      const diskContent = await fileObj.text()
      const deltas = getDeltaOperations(item.text.toString(), diskContent)
      item.text.applyDelta(deltas)
    } else {
      console.error(`CaptureDeltaFromFile is not supposed to be called on directories: ${item.id}`)
    }
  }

  async CaptureDeltaFromFile(item: project.Item, handle: FileSystemFileHandle) {
    if (handle.kind === 'file') {
      // Update version
      const fileObj = await handle.getFile()
      if (fileObj.lastModified !== this.caches[item.id].lastModified) {
        this.UpdateYDocContent(item, fileObj)
      }
      //
    }
  }

}
