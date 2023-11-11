Current schedule: #18, #13, #9, #5 done before hackathon

# #1 Use namespace interface

Currently SyncAgent uses the `Namespace` interface from `backend\sync-agent\namespace.ts`.
However, there are a lot of other places that use hard-coded namespace. Such as:

https://github.com/zjkmxy/ndn-workspace-solid/blob/dbb3c470b1fdc62c2a52a3cc78889a64686ebdd8/src/backend/main.ts#L106

Come up with a more general namespace implementation that can convert names for everyone.
Note that there is no need to rewrite the existing `Namespace` interface.
Application specific components may access specific implementation rather than depending on interface.

# #3 Better navigation bar

The navigation bar on the left takes too much space so users cannot open two windows side-by-side.
A better design may be like the navigation rail in material 3: https://m3.material.io/components/navigation-rail/overview
MUI's [Tab](https://mui.com/material-ui/react-tabs/#icon-tabs) should be a great fit for this,
but unfortunately SUID has not ported this component yet: https://github.com/swordev/suid/issues/120
So we have to use other component to simulate.

If you want to use other MUI components, make sure to check if SUID has ported them.
If you want to use Google's [material web](https://github.com/material-components/material-web/blob/main/docs/roadmap.md),
you can also do it.
I would hesitate to import another UI library.

# #5 Support version update of blob files

Current implementation on blob files only supports uploading new files.
No updating existing ones. No deletion.
Need to add support for
- Uploading a new version to replace existing files (DONE)
- Deleting existing files. Including bolb files and docs.

*Note: better get #4 done first*

# #6 Conflict of names when creating files

Should be good. Not tested, though.

Handle simultaneous uploading files into the same folder with same name.
I don't know what will happen if two users do so with current code.

Note: after #4 is done, it should be OK to temporarily have files with the same name in the same folder.
  The only trouble would be not able to export as a ZIP.

# #8 Local snapshot

Yjs generates an update of size about 20B for every key an online user pushes.
This will use up a lot of storage and makes it slow for an offline user to catch up latest content.
Therefore, it would be necessary to take snapshots.
Yjs itself offers this function via [encodeStateAsUpdate](https://docs.yjs.dev/api/document-updates#update-api).
However, we need a mechanism to handle this.
More specifically, there are two stages:
- Generate a local snapshot when there are too many updates.
  May drop some very old updates at this time.
  This should not affect Sync too much.
- Generate a global snapshot after running for a long time,
  so that offline users can catch up with the shapshot instead of all packets.
  This requires protocol design and is considered as a hard problem.
  - Security-wise there is no challenge, though.

See also: https://discuss.yjs.dev/t/indexeddb-takes-up-a-lot-of-space/1742/2

# #9 A better way to compile pdfs

https://github.com/zjkmxy/ndn-workspace-solid/blob/dbb3c470b1fdc62c2a52a3cc78889a64686ebdd8/src/components/share-latex/share-latex.tsx#L124

Current implementation tries to push a ZIP file to localhost's 6175 port, which is supposed to be running a LaTeX server.
We need a better design for this.

Note: the LaTeX server's code is not published. Please let me know if you need to access it.

Idea: maybe use RICE like discovery protocol (DISCOVERY -> REQUEST)
Idea2: maybe sync to a system folder?
  SA: https://motif.land/blog/syncing-text-files-using-yjs-and-the-file-system-access-api

# #10 Allow multiple LaTeX projects in one workspace

Currently we assume all files belong to one single LaTeX project.
How about adding multiple projects support, just as Overleaf?

# #11 Better data responder / server / producer

https://github.com/zjkmxy/ndn-workspace-solid/blob/dbb3c470b1fdc62c2a52a3cc78889a64686ebdd8/src/backend/main.ts#L99

Now, all Data packet are served by SyncAgent.
Actually even CertStorage is not a real storage.
We need to either separate responder out of SyncAgent or officially support certificates in SyncAgent by adding a new channel.

# #12 (HARD) PeerJS just one hop

https://github.com/zjkmxy/ndn-workspace-solid/blob/dbb3c470b1fdc62c2a52a3cc78889a64686ebdd8/src/adaptors/peerjs-transport.ts#L8

To correctly use PeerJS transport without having Interest loop, we need to do one of the following:
- Avoid Interests' being forwarded. (Recommended by the professor)
- Drop in some quick fix to the NDNts's "forwarder" so that it can surpress unsatisfied Interests
- Compile an in-browser forwarder using WASM.

UPDATE: See Varun's work.

# #13 (HARD) A better way to restart

https://github.com/zjkmxy/ndn-workspace-solid/blob/dbb3c470b1fdc62c2a52a3cc78889a64686ebdd8/src/backend/sync-agent/deliveries.ts#L215-L219

Note:
- Current `reset()` function will not prevent user from inputting more text.
  However, since the user is alreay out-of-sync, these extra text will be silently dropped.
  In some worse situation the user may be permanently out of sync.
- After discussion, I think the best we can do is to break the connection and stop.

# #14 Better security validation

Current CertStorage uses a very naive trust schema: a certificate is signed by any known certificate in the storage,
and any other data packet is signed by any fetchable certificate.
Come up with a better way to handle this.

# #17 Use Toast notification instead of logs

Toast / [Snackbar](https://mui.com/material-ui/react-snackbar/) should be used to show error messages,
as normal users won't be able to check logs (`console.error`).
However, SUID has no port for this component yet.
May try https://www.solid-toast.com/ if you want.

# #18 Add QRCode back

Allow users to bootstrap with QRCode instead of manual input.
See:
- https://github.com/zjkmxy/ndn-workspace/blob/main/src/components/config/cert-qrcode.tsx
- https://github.com/zjkmxy/ndn-workspace/blob/main/src/routes/config.tsx

# #19 (HARD) Add Calendar back

Similar to #15, old codebase also has a [shared Calendar](https://github.com/zjkmxy/ndn-workspace/tree/main/src/components/calendar).
However, this has more problems:
- Not showing events starting at 0:00AM
- Events are stored by their hour-based time slot instead of date.
- ...

# #20 (Not sure) Allow demux workspaces by channel numbers

Suggested by Tianyuan, maybe we should allow users to add a demux number for each trust anchor,
so that one trust anchor can be used for multiple workspaces.

# #21 (Low Priority) Add global configuration

Add global configuration for storage (In-Memory or OPFS) and other fine tuning parameters.

# #22 (Low Priority) Blob channel related things

There are several small TODOs in the SyncAgent implementation related to the `blob` channel.
Check for `sync-agent.ts` file. These include:
- Do not save reassembled blob files in the storage to save space.


# #23 (FUTURE) Add chat so we can get rid of Slack?

If we can get Google Doc replica done, adding chat support should be kind of easy.
Slack charges for managing chat histories, so the chat history of the IRL group is only kept for 30 days.
Since we do not really need "advanced" features of slack, we can move away from it and keep chat histories ourselves.

# #24 (FUTURE, Not sure) Run Sync in the SW

Do we need to move SyncAgent to the background Service Worker, so the Sync can keep running even when UI is not active?

# #25 (FAR FUTURE) Encryption

Encrypt user data.

# #26 (FAR FUTURE) Member management

Allow workspace owners to create workspaces and manage members within the app,
and get rid of the external ndncert server.

We may use Yjs docs to do user management, but the entanglement of sync and security will make things **extremely complicated**.

# #27 (FAR FUTURE) High-level sync protocol design

Not planned

- Persistency
- Recovery
- Snapshot

# #28 (FAR FUTURE) Pinning a specific version and allowing navigations through histories

Not planned

# #29 (FAR FUTURE) Support git repos

Not planned

# #30 (MISC) CertStorage should have a different name

It is not a storage at all.

# #31 (MISC) Add documentation to NDNts

NDNts is really a good library with potentials to develop real NDN applications.
However, current documentation lacks necessary details:
- Some functions/classes are not documented
- Failure handling is not clear for documented functions (returning undefined vs raising exceptions).
  For example, calling `createSigner` with the *certificate* name will raise an exception.
  Calling `SvStateVector.get` with a non-existing node ID will obtain 0.
- Tutorials are deeply in the forest of packages. Also, some are not well explained.
- Some classes are not supposed to be created by ctors by users,
  but the doc does not give hints on which function should be used instead.
- Side effects are not well explained.
  For example, `Name.append` does not modify the input but return a new `Name` instead.

If we have time, wrap this as a Hackathon project and get involved.

# #32 (TEST) Recovery from sleep or WiFi

Run a test and see what will happen and if there is anything we need to fix.

# #33 Sign SVS Sync Interest

As title stated.

# #7 Support storage (DONE)

Currently everything is stored in memory.
Need to add support for persistent storage -- such as OPFS, indexedDB, or File System API -- before Hackathon.

To get this done, two things need to be handled:
- Yjs document.
  - Note: you can simply apply all stored updates. Like: https://github.com/yjs/y-indexeddb/blob/41a5e5964e698f11eb287ea029eb141fe6332039/src/y-indexeddb.js#L22
- Boostrapping data

# #2 Allow multiple profiles (DONE)

Currently only one workspace and one identity can be bootstrapped.
This is not convenient to both users and developers.
I plan to support multiple profiles, where a profile is a combination of a namespace and a boostrapped identity,
and allow users to select a stored profile at the home page.
At the first stage, we may still run one profile in the backend.

*Note: also think about #7 when doing this*

# #4 Better doc model for files (DONE)

https://github.com/zjkmxy/ndn-workspace-solid/blob/dbb3c470b1fdc62c2a52a3cc78889a64686ebdd8/src/backend/models.ts#L9-L27

Current data model of LaTeX project files is recursive.
However, the SyncedStore (Yjs wrapper) only supports deep observation.
This means that if someone is viewing the ROOT folder, he will receive a notification for all edits made at anywhere.
I plan to change this to non-recursive data structures using UUID:

```typescript
type FileListEntry = {
  name: string
  uuid: string  // Unique for every created fil and immutable
  version?: number  // Reserved for pinning a specific version in future, see #29 below
}
type FileList = FileListEntry[]
// ...
```

Also, after this update, the URL of file view should depend on UUID instead of path:
https://github.com/zjkmxy/ndn-workspace-solid/blob/dbb3c470b1fdc62c2a52a3cc78889a64686ebdd8/src/index.tsx#L38C26-L38C38

# #34 YaNFD does not work with this app (DONE)

See https://github.com/named-data/YaNFD/issues/55

# #16 Separate routing and application (DONE)

The routing registration command should be signed by a different certificate from the one for the workspace.
This requires some UI design to allow this.
- Do we memorize WebSocket URI + certificate bundles and allow user to choose?
  If so, we need a completely different Connection page.

Also, register both the workspace prefix and the user prefix.

# #15 Add Google Doc back (DONE)

The old NDN workspace has a [Google Doc replica](https://github.com/zjkmxy/ndn-workspace/tree/main/obsoleted/components/docs).
I think it is good and we should add it back.
We need to modify the following things:
- Use standard MUI instead of CSS. They look too different.
- No need to display document preview.
- Use [ProseMirror](https://prosemirror.net/) or TipTap instead of Quill.
  - Quill is a little old, and ProseMirror is written by the same author as a current dependency CodeMirror.

# #35 Size issue of CodeMirror (DONE)

It does not fit into the container when the document is large
