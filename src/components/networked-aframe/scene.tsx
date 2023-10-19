import { For, createEffect, createSignal } from "solid-js"
import { initEvent, rootDoc } from '../../backend/main'
import { Aincraft } from "../../backend/models"
import { observeDeep } from "@syncedstore/core"


function getRandomColor() {
  const letters = '0123456789ABCDEF'
  let color = '#'
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)]
  }
  return color
}

/**
* Spawn entity at the intersection point on click, given the properties passed.
*
* `<a-entity intersection-spawn="mixin: box; material.color: red">` will spawn
* `<a-entity mixin="box" material="color: red">` at intersection point.
*
* NOTE: This must be outside any function to avoid re-registration
*/
AFRAME.registerComponent('intersection-spawn', {
  schema: {
    default: '',
    parse: AFRAME.utils.styleParser.parse
  },

  init: function () {
    const data = this.data
    const el = this.el

    el.addEventListener(data.event, evt => {
      // Snap intersection point to grid and offset from center.
      const pos: { x: number, y: number, z: number } = (AFRAME.utils as any).clone(evt.detail.intersection.point)
      data.offset = AFRAME.utils.coordinates.parse(data.offset)
      data.snap = AFRAME.utils.coordinates.parse(data.snap)
      pos.x = Math.floor(pos.x / data.snap.x) * data.snap.x + data.offset.x
      pos.y = Math.floor(pos.y / data.snap.y) * data.snap.y + data.offset.y
      pos.z = Math.floor(pos.z / data.snap.z) * data.snap.z + data.offset.z

      const newBox = {
        ...pos,
        color: getRandomColor(),
        id: `box-${Date.now()}`
      }
      rootDoc.aincraft.items?.push(newBox)
      console.debug(`Created box: ${JSON.stringify(newBox)}`)
    })
  }
})

export default function Scene() {
  const [root, setRoot] = createSignal<Partial<Aincraft>>()
  const [items, setItems] = createSignal<Aincraft['items']>([])

  createEffect(() => {
    initEvent.then(() => {
      setRoot(rootDoc.aincraft)
    })
  })

  createEffect(() => {
    const curRoot = root()
    if (curRoot !== undefined) {
      setItems((curRoot.items ?? []).map(x => x))
      return observeDeep(curRoot, () => {
        setItems((curRoot.items ?? []).map(x => x))
      })
    }
  })

  return (
    <a-scene embedded>
      <a-assets id="assets">
        <img id="groundTexture" src="/floor.jpg" alt="" />
        <img id="skyTexture" src="/sky.jpg" alt="" />
        <a-mixin id="voxel" geometry="primitive: box; height: 0.5; width: 0.5; depth: 0.5"
          material="shader: standard" />
      </a-assets>
      <a-cylinder id="ground" src="#groundTexture" radius="32" height="0.1" />
      <a-sky id="background" src="#skyTexture" radius="30" theta-length="90" />
      <a-camera id="camera">
        <a-cursor id="cursor"
          intersection-spawn="event: click; offset: 0.25 0.25 0.25; snap: 0.5 0.5 0.5" />
      </a-camera>
      <For each={items()}>{(obj) =>
        <a-entity
          mixin='voxel'
          attr: position={`${obj.x} ${obj.y} ${obj.z}`}
          attr: id={obj.id}
          attr: material={`color: ${obj.color}`} />
      }</For>
    </a-scene>
  )
}
