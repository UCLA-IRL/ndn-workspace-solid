export type FileWorkerMessage = {
  handle: FileSystemFileHandle
  content: ArrayBuffer
  fid: string
}

onmessage = (ev: MessageEvent<FileWorkerMessage>) => {
  const data = ev.data
  data.handle.createSyncAccessHandle().then(accessHandle => {
    const size = accessHandle.write(data.content, { at: 0 })
    accessHandle.truncate(size)
    accessHandle.flush()
    accessHandle.close()
    postMessage(data.fid)
  })
}
