import { For } from "solid-js"

export default function Scene() {
  //   /**
  //  * Spawn entity at the intersection point on click, given the properties passed.
  //  *
  //  * `<a-entity intersection-spawn="mixin: box; material.color: red">` will spawn
  //  * `<a-entity mixin="box" material="color: red">` at intersection point.
  //  */
  //   AFRAME.registerComponent('intersection-spawn', {
  //     schema: {
  //       default: '',
  //       parse: AFRAME.utils.styleParser.parse
  //     },

  //     init: function () {
  //       const data = this.data;
  //       const el = this.el;

  //       el.addEventListener(data.event, evt => {
  //         // Create element.
  //         const spawnEl = document.createElement('a-entity');

  //         // Snap intersection point to grid and offset from center.
  //         const pos = AFRAME.utils.clone(evt.detail.intersection.point)
  //         data.offset = AFRAME.utils.coordinates.parse(data.offset)
  //         data.snap = AFRAME.utils.coordinates.parse(data.snap)
  //         pos.x = Math.floor(pos.x / data.snap.x) * data.snap.x + data.offset.x;
  //         pos.y = Math.floor(pos.y / data.snap.y) * data.snap.y + data.offset.y;
  //         pos.z = Math.floor(pos.z / data.snap.z) * data.snap.z + data.offset.z;

  //         spawnEl.setAttribute('position', pos);
  //         let boxColor = getRandomColor();
  //         spawnEl.setAttribute('material', 'color', boxColor);

  //         // Set components and properties.
  //         Object.keys(data).forEach(name => {
  //           if (name === 'event' || name === 'snap' || name === 'offset') {
  //             return;
  //           }
  //           AFRAME.utils.entity.setComponentProperty(spawnEl, name, data[name]);
  //         });

  //         // Generate random NDN name
  //         let ver = Date.now()
  //         let boxId = `box-${ver}`
  //         spawnEl.setAttribute('id', boxId);
  //       });
  //     }
  //   });

  const objs = [
    { x: 0, y: 0, z: 0, color: '#AABBCC', id: 'box-01020304' },
    { x: 1, y: 1, z: 1, color: '#998877', id: 'box-05060708' }
  ]

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
        {/* <a-cursor id="cursor"
          intersection-spawn="event: click; offset: 0.25 0.25 0.25; snap: 0.5 0.5 0.5; mixin: voxel" /> */}
      </a-camera>
      <For each={objs}>{(obj) =>
        <a-entity
          mixin='box voxel'
          attr:position={`${obj.x} ${obj.y} ${obj.z}`}
          attr:id={obj.id}
          attr:material={`color: ${obj.color}`} />
      }</For>
    </a-scene>
  )
}
