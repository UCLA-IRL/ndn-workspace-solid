import * as Y from 'yjs'
import JSZip from 'jszip'
import { Name } from '@ndn/packet'

export type ItemBase = {
  /** Item UUID */
  id: string

  /**
   * File path to the base directory.
   * `/` for the root, `/base/folder/a.txt` for `a.txt` under `base/folder`.
   */
  // Removed because global information is not reliable.
  // fullPath: string

  /** The UUID of its parent. `undefined` for the root node. */
  parentId: string | undefined

  /** The file name. */
  name: string

  /** The kind of the item. Used to determine which page is used to view it. */
  kind: string

  /** Whether the file has been deleted or not. Used to distinguish between current and historical files of the same name. */
  deleted: boolean
}

export type Folder = ItemBase & {
  kind: 'folder'

  /**
   * An unordered, non-duplicative list of containing subitems under this folder.
   * NO guarantee that the subitems have different names.
   */
  items: string[]
}

export type TextDoc = ItemBase & {
  kind: 'text'

  /** Shared plain text */
  text: Y.Text
}

export type XmlDoc = ItemBase & {
  kind: 'xmldoc'

  /** Shared XML for rich text */
  text: Y.XmlFragment
}

export type MarkdownDoc = ItemBase & {
  kind: 'markdowndoc'

  /**
   * Shared XMLFragment for Markdown used by Milkdown
   * NOTE: The name cannot be changed due to a hard coding in Milkdown.
   *   https://github.com/Milkdown/milkdown/blob/1723d36b5298d3f1d1caab33241258eb7a333beb/packages/plugins/plugin-collab/src/collab-service.ts#L109C44-L109C55
   */
  prosemirror: Y.XmlFragment
}

export type BlobFile = ItemBase & {
  kind: 'blob'

  /**
   * The canonical NDN name for this object with correct version component.
   * This name may be referring to a segmented object, instead of a single Data packet.
   */
  blobName: string
}

export type Item = Folder | TextDoc | XmlDoc | MarkdownDoc | BlobFile

export type Items = { [docId: string]: Item }

export const RootId = '00000000-0000-0000-0000-000000000000'
export const WorkspaceDocId = '00000000-0000-0000-0000-000000000001'

export type PartItems = Partial<Items>

/**
 * Get the file name without directory path from an item.
 * @param item the Item
 * @returns the file name. `undefined` if not existing.
 * @privateRemarks To remove duplication, decide not to add a `name: string` field into `ItemBase`.
 */
// export function getName(item?: ItemBase) {
//   if (item === undefined) {
//     return undefined
//   }
//   const paths = item.fullPath.split('/')
//   if (paths.length <= 0) {
//     return undefined
//   } else {
//     return paths[paths.length - 1]
//   }
// }

/**
 * Get the parent ID chain of an item in the array format, without the RootId.
 * @param items the list of all items
 * @param item the item
 * @returns the full path in array form. `[]` for the root, and
 *    `[base.uuid, folder.uuid, a.txt.uuid]` for `a.txt` under `base/folder`.
 *    `undefined` if the file cannot be resolved to the root.
 */
export function getPaths(items: PartItems, item?: ItemBase): string[] | undefined {
  if (item?.id === RootId) {
    return []
  }
  if (item === undefined || item.parentId === undefined) {
    return undefined
  }
  const basePaths = getPaths(items, items[item.parentId])
  if (basePaths === undefined) {
    return undefined
  }
  basePaths.push(item.id)
  return basePaths
}

/**
 * Get the full path of an item in the string format.
 * @param items the list of all items
 * @param item the item
 * @returns the full path in array form. `/` for the root, and
 *    `/base/folder/a.txt` for `a.txt` under `base/folder`.
 *    Empty string if the file cannot be resolved to the root.
 */
export function getFullPath(items: PartItems, item?: ItemBase): string {
  const paths = getPaths(items, item)
  if (paths === undefined) {
    return ''
  } else {
    return paths.reduce((prev, cur) => prev + '/' + items[cur]!.name, '')
  }
}

/**
 * Resolve the path to UUID.
 * @param items the list of all items
 * @param pathNames a list containing path names, with each item name being an element.
 *    For example, `['base', 'folder']` for `./base/folder`
 * @param baseId the UUID of the folder starting at. Use the root for default.
 * @returns the UUID of the specified object. `undefined` if not existing.
 * @remarks NO guarantee that the file names in a folder is non-duplicative.
 *    In that case, this function always returns the first match.
 */
export function itemIdAt(items: PartItems, pathNames: string[], baseId: string = RootId) {
  return pathNames.reduce<string | undefined>((prev, current) => {
    const prevItem = prev === undefined ? undefined : items[prev]
    if (current === '') {
      // Handle extra '/' like 'a//b' and empty path ''
      // 'a//b'.split('/') === ['a', '', 'b']
      // ''.split('/') === ['']
      return prev
    } else if (prevItem?.kind === 'folder') {
      return prevItem.items.find((item) => items[item]?.name === current)
    } else {
      // Invalid path
      return undefined
    }
  }, baseId)
}

export async function exportAsZip(
  resolveBlob: (name: Name) => Promise<Uint8Array | undefined>,
  items: PartItems,
  baseId: string = RootId,
) {
  const zip = new JSZip()
  await walk(resolveBlob, items, null, zip.file.bind(zip), baseId)
  return zip
}

export async function walk(
  resolveBlob: (name: Name) => Promise<Uint8Array | undefined>,
  items: PartItems,
  callbackFolder: null | ((path: string) => void),
  callbackFile: null | ((path: string, item: string | Uint8Array) => void),
  baseId: string = RootId,
) {
  const examine = async (basePath: string, curId: string) => {
    const curItem = items[curId]
    const curPath = basePath ? `${basePath}/${curItem?.name}` : `${curItem?.name}`
    if (curItem === undefined) {
      return
    } else if (curItem.kind === 'folder') {
      callbackFolder?.(curPath)
      for await (const subId of curItem.items) {
        await examine(curPath, subId)
      }
    } else if (curItem.kind === 'text') {
      callbackFile?.(curPath, curItem.text.toString())
    } else if (curItem.kind === 'xmldoc') {
      callbackFile?.(curPath, curItem.text.toString())
    } else if (curItem.kind === 'markdowndoc') {
      callbackFile?.(curPath, curItem.prosemirror.toString())
    } else if (curItem.kind === 'blob') {
      try {
        const blobName = new Name(curItem.blobName)
        const blob = await resolveBlob(blobName)
        if (blob) {
          callbackFile?.(curPath, blob)
        }
      } catch (e) {
        console.error(`[project.exportAsZip] Unable to pack blob file ${curPath}: `, e)
      }
    }
  }
  await examine('', baseId)
}

export async function exportFlatZip(resolveBlob: (name: Name) => Promise<Uint8Array | undefined>, items: PartItems) {
  const zip = new JSZip()
  for (const [curId, curItem] of Object.entries(items)) {
    if (curItem === undefined) {
      continue
    } else if (curItem.kind === 'folder') {
      const value = JSON.stringify(curItem)
      zip.file(`${curId}.folder.json`, value)
    } else if (curItem.kind === 'text') {
      zip.file(`${curId}.tex`, curItem.text.toString())
    } else if (curItem.kind === 'xmldoc') {
      zip.file(`${curId}.xml`, curItem.text.toString())
    } else if (curItem.kind === 'markdowndoc') {
      zip.file(`${curId}.md`, curItem.prosemirror.toString())
    } else if (curItem.kind === 'blob') {
      try {
        const blobName = new Name(curItem.blobName)
        const blob = await resolveBlob(blobName)
        if (blob) {
          zip.file(curId, blob)
        }
      } catch (e) {
        console.error(`[project.exportFlatZip] Unable to pack blob file ${curId}: `, e)
      }
    }
  }
  return zip
}
