// SA: https://github.com/lmaccherone/node-localstorage/blob/master/LocalStorage.coffee
export const encodeKey = (key: string) =>
  encodeURIComponent(key).replace(
    /[!'()*~.]/g,
    ch => '%' + ch.charCodeAt(0).toString(16).toUpperCase()
  )
