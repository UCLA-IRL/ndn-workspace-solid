import { syncedStore } from "@syncedstore/core"
import * as Y from 'yjs'
import JSZip from 'jszip'
import { syncAgent } from "./main"
import { Decoder } from "@ndn/tlv"
import { Name } from "@ndn/packet"

export type ProjFolder = {
  kind: 'folder'
  name: string
  items: ProjFileDesc[]
}

export type ProjDoc = {
  kind: 'doc'
  name: string
  text: Y.Text
}

export type ProjBlob = {
  kind: 'blob'
  name: string
  blobName: string
}

export type ProjFileDesc = ProjFolder | ProjDoc | ProjBlob

export type DocType = {
  docId: string,
  text: string
}
export type DocumentsType = { [docId: string]: DocType }

export type Aincraft = {
  items: {
    x: number,
    y: number,
    z: number,
    color: string,
    id: string,
  }[]
}

export type RootDocType = {
  documents: DocumentsType,
  calendar: Calendar,
  latex: {
    root: ProjFolder
  },
  aincraft: Aincraft
}
export type RootDocStore = ReturnType<typeof syncedStore<RootDocType>>

export type Calendar = { [time: string]: CalEvent[] }

// TODO: Use a better data model. Do not couple with frontend.
export type CalEvent = {
  id: string,
  title: string,
  start: number,
  end: number,
}

export function initRootDoc() {
  return syncedStore({
    documents: {},
    calendar: {},
    latex: {},
    aincraft: {},
  } as RootDocType)
}

export function latexFileAt(root: Partial<{ root: ProjFolder }>, pathNames: string[]) {
  return pathNames.reduce<ProjFileDesc | undefined>((prev, current) => {
    if (current === '') {
      // Handle extra '/' like 'a//b' and empty path ''
      // 'a//b'.split('/') === ['a', '', 'b']
      // ''.split('/') === ['']
      return prev
    } else if (prev?.kind === 'folder') {
      return prev.items.find(item => item.name === current)
    } else {
      return undefined
    }
  }, root.root)
}

export async function exportAsZip(root: Partial<{ root: ProjFolder }>) {
  const zip = new JSZip()
  const examine = async (path: string, items: ProjFileDesc[]) => {
    for await (const item of items) {
      const fullName = path + item.name
      if (item.kind === 'folder') {
        examine(fullName + '/', item.items)
      } else if (item.kind === 'doc') {
        zip.file(fullName, item.text.toString())
      } else if (item.kind === 'blob') {
        try {
          const blobName = new Name(item.blobName)
          const blob = await syncAgent.getBlob(blobName)
          if(blob !== undefined) {
            zip.file(fullName, blob)
          }
        } catch (e) {
          console.error(`Unable to pack blob file ${fullName}: ${e}`)
        }
      }
    }
  }
  if (root.root) {
    await examine('', root.root?.items)
  }
  return zip
}
