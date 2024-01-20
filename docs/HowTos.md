# Install

You need [pnpm](https://pnpm.io/installation) to build this project.

- Install dependencies: `pnpm install`
- Development test with hot module reload: `pnpm dev` and then open `http://localhost:5173/`
- Start a PeerJS server on localhost (not necessary for test): `pnpm run peer-server`
- Preview test: `pnpm build`, `pnpm preview` and then `http://localhost:4173/`

Please see `bootstrap-for-tes.md` for certificates used for local test.

# Conflict of namespace

- Make sure exactly one node clicks the `CREATE` button.
- Make sure a safe bag is only used once.
  If you reuse the safebag, even after the original tab is closed, the new node will be out of sync.
- Testbed nodes require specific configuration.

# Choose of browser

Chrome and Edge are preferred over Firefox. I'm using Edge 118, but Chrome 118+ should also work.
The application can run on Firefox 118+, but the Solid dev tools and the PWA are not supported by Firefox.
Also, it is not guaranteed the File System API works the same as Chromium based browsers.
Safari 17+ is theoretically supported but not tested.

# Set up debug tools

You can use [solid-devtools](https://github.com/thetarnav/solid-devtools) to examine signals.
Install the Chrome extension, and uncomment the following code:

https://github.com/zjkmxy/ndn-workspace-solid/blob/dbb3c470b1fdc62c2a52a3cc78889a64686ebdd8/vite.config.ts#L4
https://github.com/zjkmxy/ndn-workspace-solid/blob/dbb3c470b1fdc62c2a52a3cc78889a64686ebdd8/vite.config.ts#L11-L13
https://github.com/zjkmxy/ndn-workspace-solid/blob/dbb3c470b1fdc62c2a52a3cc78889a64686ebdd8/src/index.tsx#L4

Then, you can see a `Solid` panel in the F12 development tools, where components and signals can be examined.

Note: enabling devtools will add to loading latency by about 1 second.

# Check OPFS

[Origin Private File System](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)
is a persistent virtual file system simulated by the browser.
Install the [OPFS Explorer](https://chrome.google.com/webstore/detail/opfs-explorer/acndjpgkpaclldomagafnognkcgjignd)
extension and then you can see a panel called `OPFS Explorer` in the F12 development tools.
You can download the OPFS files there and delete them one by one.
To clear all files at once, you may try to open the `Application` panel and click the `Click site data`.
However, files are not guaranteed to be removed.

# Test SW

[Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) are the backend of PWAs.
However, due to performance and cache invalidation reason, they are on for development test.
Most of the time it just works automagically.
If you want to explicitly test it, run a preview build by `pnpm build` followed by `pnpm preview` and then open
the `4173` port.

To enable this, set the following to be `true`:

https://github.com/zjkmxy/ndn-workspace-solid/blob/dbb3c470b1fdc62c2a52a3cc78889a64686ebdd8/vite.config.ts#L19

In the current configuration, SW may offer out-of-dated pages sometimes.
This is because this application is a Single Page App (SPA),
where almost all requests are satisfied only by JS (in-browser router) and the server cannot answer those requests.

SA: https://tomwilderspin.medium.com/updating-progressive-web-applications-with-service-workers-ffca192ec16b

# Solid is not React

Solid JS is a vary new frontend framework so that there are only very limited learning resources.
In the case you cannot find the tutorials or documents you are looking for, you may use the corresponding React versions.
Most of the time they can be easily translated into Solid.
Just be aware of the following differences:

- Solid uses signal `state()` instead of (dirty) value `state`.
- Solid only support function components.
- Solid components are rendered (as a whole) only once,
  so you cannot put anything reacttive in the top level of the component function.
  The compiler will give you a warning if you try to do so.
  Most of the time you can simply create a new signal for the thing you want to compute.
  `createEffect` is also good.
- Since Solid gets rid of frequent rerendering, `createMemo` is not as useful as React.
  You can simply translate everything (`useMemo`/`useCallback`/...) into `createEffect`.
- You are supposed to use `<For each={}>` and `<Switch>`/`<Show when={}>` for loops and branches in the JSX part.
  The compiler will warn you if you keep a React-style `array.forEach` in that part.
