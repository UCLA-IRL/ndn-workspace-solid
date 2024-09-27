// Ref: https://github.com/motifland/yfs
import { getDeltaOperations } from './diff'
import * as project from '../models/project'
import { SyncAgent } from '@ucla-irl/ndnts-aux/sync-agent'
import { Name } from '@ndn/packet'
import { RootDocStore } from '../models'

type LastWriteCacheData = {
  // Last modified date, used to capture the updates from the disk file
  lastModified: number
  // Last content, used to capture the updates from remote peers
  content: string
}

export class FileMapper {
  private caches: { [id: string]: LastWriteCacheData } = {}
  private inSync = false

  constructor(
    readonly syncAgent: SyncAgent,
    readonly rootDoc: RootDocStore,
    readonly rootHandle: FileSystemDirectoryHandle,
  ) {}

  private async UpdateYDocContent(item: project.Item, fileObj: File) {
    // Note: modifying item has side effects. Preceed with caution.
    if (item.kind === 'xmldoc') {
      // ignore XML docs
      return
    } else if (item.kind === 'markdowndoc') {
      // ignore markdown docs
      return
    } else if (item.kind === 'blob') {
      // Update version
      const arrBuf = await fileObj.arrayBuffer()
      const buf = new Uint8Array(arrBuf)
      if (buf.length === 0) {
        return
      }
      const blobName = await this.syncAgent.publishBlob('latexBlob', buf)
      // In a conflict, we take local, the adaptor should propagate these deltas at this time
      item.blobName = blobName.toString()
      // No write back
      this.caches[item.id] = {
        lastModified: fileObj.lastModified,
        content: item.blobName,
      }
    } else if (item.kind === 'text') {
      const diskContent = await fileObj.text()
      // Do not use item.text.toString(). It may contain new updates.
      const deltas = getDeltaOperations(this.caches[item.id].content, diskContent)
      // Apply local deltas to remote. Do not update caches to trigger writting back
      // The adaptor should propagate these deltas at this time
      item.text.applyDelta(deltas)
    } else {
      console.error(`CaptureDeltaFromFile is not supposed to be called on directories: ${item.id}`)
    }
  }

  private async WriteBackLocalFile(
    item: project.Item,
    remoteContent: string,
    writeHandle: FileSystemWritableFileStream,
  ) {
    if (item.kind === 'xmldoc') {
      // ignore XML docs
      return
    } else if (item.kind === 'markdowndoc') {
      // ignore markdown docs
      return
    } else if (item.kind === 'blob') {
      const objName = new Name(remoteContent)
      const blobContent = await this.syncAgent.getBlob(objName)
      if (blobContent !== undefined) {
        await writeHandle.write(blobContent)
      }
    } else if (item.kind === 'text') {
      await writeHandle.write(remoteContent)
    } else {
      console.error(`CaptureDeltaFromFile is not supposed to be called on directories: ${item.id}`)
    }
  }

  private async SyncWithItem(item: project.Item, handle: FileSystemHandle) {
    if (handle.kind === 'file') {
      const fileHandle = handle as FileSystemFileHandle
      // Update version
      const fileObj = await fileHandle.getFile()
      // Init
      if (this.caches[item.id] === undefined) {
        this.caches[item.id] = {
          content: '',
          lastModified: fileObj.lastModified,
        }
      }
      if (fileObj.lastModified !== this.caches[item.id].lastModified) {
        await this.UpdateYDocContent(item, fileObj)
      }
      const remoteContent = (() => {
        if (item.kind === 'blob') {
          return item.blobName
        } else if (item.kind === 'text') {
          return item.text.toString()
        } else {
          return undefined
        }
      })()
      // Write back remote updates
      if (remoteContent !== undefined && remoteContent !== this.caches[item.id].content) {
        const writeHandle = await fileHandle.createWritable({
          keepExistingData: false,
        })
        await this.WriteBackLocalFile(item, remoteContent, writeHandle)
        await writeHandle.close()

        const fileObj = await fileHandle.getFile()
        this.caches[item.id] = {
          lastModified: fileObj.lastModified,
          content: remoteContent,
        }
      }
    } else if (handle.kind === 'directory') {
      const dirHandle = handle as FileSystemDirectoryHandle
      if (item.kind === 'folder') {
        // Recursive check
        for (const uid of item.items) {
          const subItem = this.rootDoc.latex[uid]
          if (subItem?.kind === 'folder') {
            const subHandle = await dirHandle.getDirectoryHandle(subItem.name, {
              create: true,
            })
            await this.SyncWithItem(subItem, subHandle)
          } else if (subItem !== undefined) {
            const subHandle = await dirHandle.getFileHandle(subItem.name, {
              create: true,
            })
            await this.SyncWithItem(subItem, subHandle)
          }
        }
      }
    }
  }

  public async SyncAll() {
    if (this.inSync) {
      return
    }
    this.inSync = true
    const rootItem = this.rootDoc.latex[project.RootId]
    if (rootItem !== undefined) {
      await this.SyncWithItem(rootItem, this.rootHandle)
    }
    this.inSync = false
  }
}
