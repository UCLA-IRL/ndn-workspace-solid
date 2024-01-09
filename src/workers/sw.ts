import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import * as navigationPreload from 'workbox-navigation-preload'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { DefaultTexliveEndpoint } from '../constants'
import { encodeKey, openRoot } from '../utils'
import { CacheableResponsePlugin } from 'workbox-cacheable-response/CacheableResponsePlugin'
import { CacheFirst } from 'workbox-strategies/CacheFirst'
import { ExpirationPlugin } from 'workbox-expiration/ExpirationPlugin'

declare let self: ServiceWorkerGlobalScope;


// Enable navigation preload.
navigationPreload.enable();

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST, {
  ignoreURLParametersMatching: [/.*/],
});

// const navigationRoute = new NavigationRoute(strategy, {
//   // Optionally, provide a allow/denylist of RegExps to determine
//   // which paths will match this route.
//   // allowlist: [],
//   // denylist: [],
// })

registerRoute(new NavigationRoute(
  createHandlerBoundToURL("index.html"),
  {
    denylist: [/\/stored\/.*/],
  }));

registerRoute(/\/stored\/.*/, async (options) => {
  const request = options.request;
  const originalUrl = new URL(request.url);
  let newUrl;
  if (originalUrl.pathname.startsWith('/stored/pdftex/')) {
    newUrl = new URL(originalUrl.pathname.substring(7), DefaultTexliveEndpoint);
  } else {
    // Should never reach here
    newUrl = originalUrl;
  }

  const opfsRoot = await openRoot();
  const stored = await opfsRoot.getDirectoryHandle('stored', { create: true });
  const hashStr = encodeKey(newUrl.toString());
  try {
    const fileHandle = await stored.getFileHandle(hashStr);
    const fileObj = await fileHandle.getFile();
    const fileContent = await fileObj.arrayBuffer();

    const hdrHandle = await stored.getFileHandle(hashStr + '__header');
    const hdrObj = await hdrHandle.getFile();
    const hdrContent = JSON.parse(await hdrObj.text());

    if (hdrContent.status === 200) {
      return new Response(fileContent, {
        headers: hdrContent.headers,
      });
    } else {
      return new Response(null, {
        status: hdrContent.status,
        headers: hdrContent.headers,
      });
    }
  } catch {
    // do nothing
  }

  const newRequest = new Request(newUrl, request);
  const result = await fetch(newRequest);

  if (result.status === 200) {
    // Write content
    const fileHandle = await stored.getFileHandle(hashStr, { create: true });
    const writable = await fileHandle.createWritable({ keepExistingData: false });
    await writable.write(await result.clone().arrayBuffer());
    await writable.close();
  } else if (result.status === 301 || result.status === 404) {
    // treat 301 as 404
    // do nothing
  }

  // Write headers
  const hdrContent = {
    status: result.status,
    headers: {} as Record<string, string>,
  };
  const fileid = result.headers.get('fileid');
  if (fileid !== null) {
    hdrContent.headers['fileid'] = fileid;
  }
  const pkid = result.headers.get('pkid');
  if (pkid !== null) {
    hdrContent.headers['pkid'] = pkid;
  }
  const hdrHandle = await stored.getFileHandle(hashStr + '__header', { create: true });
  const hdrWritable = await hdrHandle.createWritable({ keepExistingData: false });
  await hdrWritable.write(JSON.stringify(hdrContent));
  await hdrWritable.close();

  return result;
});

registerRoute(
  /^https?:\/\/(cdn\.jsdelivr\.net|texlive2\.swiftlatex\.com)/,
  new CacheFirst({
    cacheName: 'external-cdn',
    matchOptions: {
      ignoreVary: true
    },
    plugins: [
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 60 * 60 * 24 * 365 * 2, // 2 years
        purgeOnQuotaError: true,
      }),
      new CacheableResponsePlugin({
        statuses: [200]
      }),
    ]
  }));
