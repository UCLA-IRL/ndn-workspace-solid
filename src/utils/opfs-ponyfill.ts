import { getOriginPrivateDirectory } from 'file-system-access'
import indexedDbAdapter from 'file-system-access/lib/adapters/indexeddb'

export const openRoot: () => Promise<FileSystemDirectoryHandle> = (() => {
  if (FileSystemFileHandle.prototype.createWritable !== undefined) {
    // Normal browsers
    return getOriginPrivateDirectory
  } else {
    // Weird Safari
    console.log('Safari ponyfill applied')
    return () => getOriginPrivateDirectory(indexedDbAdapter)
  }
})()
