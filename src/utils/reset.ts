export function panic(message: string) {
  window.alert(`A critical error happened and the app has to reset: ${message}`)
  const rootUrl = `${location.protocol}//${location.host}/`
  location.replace(rootUrl)
}
