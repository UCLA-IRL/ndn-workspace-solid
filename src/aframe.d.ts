declare global {
  declare module "solid-js" {
    namespace JSX {
      interface IntrinsicElements {
        "a-scene": any;
        "a-entity": any;
        "a-assets": any;
        "a-asset-item": any;
        "a-mixin": any;
        "a-sphere": any;
        "a-torus": any;
        "a-gltf-model": any;
        "a-light": any;
        "a-cylinder": any;
        "a-sky": any;
        "a-camera": any;
        "a-cursor": any;
      }
    }
  }
}
