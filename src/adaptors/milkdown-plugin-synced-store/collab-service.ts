import type { Ctx, MilkdownPlugin } from '@milkdown/ctx'
import { createSlice, createTimer } from '@milkdown/ctx'
import { DefaultValue, EditorViewReady } from '@milkdown/core'
import { editorViewCtx, getDoc, parserCtx, prosePluginsCtx, schemaCtx } from '@milkdown/core'
import { ctxNotBind, missingYjsDoc } from '@milkdown/exception'
import { keydownHandler } from '@milkdown/prose/keymap'
import type { Node } from '@milkdown/prose/model'
import { Plugin, PluginKey } from '@milkdown/prose/state'
import type { DecorationAttrs } from '@milkdown/prose/view'
import {
  prosemirrorToYDoc,
  redo,
  undo,
  yCursorPlugin,
  yCursorPluginKey,
  yXmlFragmentToProseMirrorRootNode,
  ySyncPlugin,
  ySyncPluginKey,
  yUndoPlugin,
  yUndoPluginKey,
} from 'y-prosemirror'
import type { Awareness } from 'y-protocols/awareness.js'
import type { PermanentUserData, XmlFragment } from 'yjs'
import { applyUpdate, encodeStateAsUpdate } from 'yjs'

/// @internal
export interface ColorDef {
  light: string
  dark: string
}

/// @internal
export interface YSyncOpts {
  colors?: Array<ColorDef>
  colorMapping?: Map<string, ColorDef>
  permanentUserData?: PermanentUserData | null
}

/// @internal
export interface yCursorOpts {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cursorBuilder?: (arg: any) => HTMLElement
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectionBuilder?: (arg: any) => DecorationAttrs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSelection?: (arg: any) => unknown
}

/// @internal
export interface yUndoOpts {
  protectedNodes?: Set<string>
  trackedOrigins?: unknown[]
  undoManager?: unknown
}

/// Options for the collab service.
export interface CollabServiceOptions {
  /// The field name of the yCursor plugin.
  yCursorStateField?: string

  /// Options for the ySync plugin.
  ySyncOpts?: YSyncOpts

  /// Options for the yCursor plugin.
  yCursorOpts?: yCursorOpts

  /// Options for the yUndo plugin.
  yUndoOpts?: yUndoOpts
}

/// @internal
export const CollabKeymapPluginKey = new PluginKey('MILKDOWN_COLLAB_KEYMAP')

const collabPluginKeys = [CollabKeymapPluginKey, ySyncPluginKey, yCursorPluginKey, yUndoPluginKey]

/// The collab service is used to manage the collaboration plugins.
/// It is used to provide the collaboration plugins to the editor.
export class CollabService {
  /// @internal
  #options: CollabServiceOptions = {}
  /// @internal
  #fragment?: XmlFragment
  /// @internal
  #awareness?: Awareness
  /// @internal
  #ctx?: Ctx
  /// @internal
  #connected = false

  /// @internal
  #valueToNode(value: DefaultValue): Node | undefined {
    if (!this.#ctx) throw ctxNotBind()

    const schema = this.#ctx.get(schemaCtx)
    const parser = this.#ctx.get(parserCtx)

    const doc = getDoc(value, parser, schema)
    return doc
  }

  /// @internal
  #createPlugins(): Plugin[] {
    if (!this.#fragment) throw missingYjsDoc()
    const { ySyncOpts, yUndoOpts } = this.#options
    const type = this.#fragment
    const plugins = [
      ySyncPlugin(type, ySyncOpts),
      yUndoPlugin(yUndoOpts),
      new Plugin({
        key: CollabKeymapPluginKey,
        props: {
          handleKeyDown: keydownHandler({
            'Mod-z': undo,
            'Mod-y': redo,
            'Mod-Shift-z': redo,
          }),
        },
      }),
    ]
    if (this.#awareness) {
      const { yCursorOpts, yCursorStateField } = this.#options
      plugins.push(yCursorPlugin(this.#awareness, yCursorOpts as Required<yCursorOpts>, yCursorStateField))
    }

    return plugins
  }

  /// @internal
  #flushEditor(plugins: Plugin[]) {
    if (!this.#ctx) throw ctxNotBind()
    this.#ctx.set(prosePluginsCtx, plugins)

    const view = this.#ctx.get(editorViewCtx)
    const newState = view.state.reconfigure({ plugins })
    view.updateState(newState)
  }

  /// Bind the context to the service.
  bindCtx(ctx: Ctx) {
    this.#ctx = ctx
    return this
  }

  /// Bind the document to the service.
  bindFragment(fragment: XmlFragment) {
    this.#fragment = fragment
    return this
  }

  /// Set the options of the service.
  setOptions(options: CollabServiceOptions) {
    this.#options = options
    return this
  }

  /// Merge some options to the service.
  /// The options will be merged to the existing options.
  /// THe options should be partial of the `CollabServiceOptions`.
  mergeOptions(options: Partial<CollabServiceOptions>) {
    Object.assign(this.#options, options)
    return this
  }

  /// Set the awareness of the service.
  setAwareness(awareness: Awareness) {
    this.#awareness = awareness
    return this
  }

  /// Apply the template to the document.
  applyTemplate(template: DefaultValue, condition?: (yDocNode: Node, templateNode: Node) => boolean) {
    if (!this.#ctx) throw ctxNotBind()
    if (!this.#fragment) throw missingYjsDoc()
    const conditionFn = condition || ((yDocNode) => yDocNode.textContent.length === 0)

    const node = this.#valueToNode(template)
    const schema = this.#ctx.get(schemaCtx)
    const yDocNode = yXmlFragmentToProseMirrorRootNode(this.#fragment, schema)

    if (node && conditionFn(yDocNode, node)) {
      this.#fragment.delete(0, this.#fragment.length)
      const templateDoc = prosemirrorToYDoc(node)
      const template = encodeStateAsUpdate(templateDoc)
      const parentYDoc = this.#fragment.doc
      if (parentYDoc !== null) {
        applyUpdate(parentYDoc, template)
      }
      templateDoc.destroy()
    }

    return this
  }

  /// Connect the service.
  connect() {
    if (!this.#ctx) throw ctxNotBind()
    if (this.#connected) return

    const prosePlugins = this.#ctx.get(prosePluginsCtx)
    const collabPlugins = this.#createPlugins()
    const plugins = prosePlugins.concat(collabPlugins)

    this.#flushEditor(plugins)
    this.#connected = true

    return this
  }

  /// Disconnect the service.
  disconnect() {
    if (!this.#ctx) throw ctxNotBind()
    if (!this.#connected) return this

    const prosePlugins = this.#ctx.get(prosePluginsCtx)
    const plugins = prosePlugins.filter((plugin) => !plugin.spec.key || !collabPluginKeys.includes(plugin.spec.key))

    this.#flushEditor(plugins)
    this.#connected = false

    return this
  }
}

/// A slice that contains the collab service.
export const collabServiceCtx = createSlice(new CollabService(), 'collabServiceCtx')

/// The timer that indicates the collab plugin is ready.
export const CollabReady = createTimer('CollabReady')

/// The collab plugin.
export const collab: MilkdownPlugin = (ctx) => {
  const collabService = new CollabService()
  ctx.inject(collabServiceCtx, collabService).record(CollabReady)
  return async () => {
    await ctx.wait(EditorViewReady)
    collabService.bindCtx(ctx)
    ctx.done(CollabReady)
    return () => {
      ctx.remove(collabServiceCtx).clearTimer(CollabReady)
    }
  }
}
collab.meta = {
  package: '@milkdown/plugin-collab',
  displayName: 'Collab',
}
