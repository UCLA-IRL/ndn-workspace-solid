import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import * as navigationPreload from 'workbox-navigation-preload'
import { registerRoute, NavigationRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope


// Enable navigation preload.
navigationPreload.enable()

self.skipWaiting()
clientsClaim()

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST, {
  ignoreURLParametersMatching: [/.*/],
})

// const navigationRoute = new NavigationRoute(strategy, {
//   // Optionally, provide a allow/denylist of RegExps to determine
//   // which paths will match this route.
//   // allowlist: [],
//   // denylist: [],
// });

registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html")))
