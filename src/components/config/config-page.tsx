// import { onMount, createSignal } from 'solid-js'
import { Stack } from '@suid/material'
import VersionTable from './version-table'
import WorkspaceState from './workspace-state'
import UpdateInspect from './update-inspect'

export default function ConfigPage() {
  return (
    <>
      <h1>DEBUG PAGE</h1>
      <Stack direction="column" spacing={2} justifyContent="flex-start">
        <VersionTable />
        <WorkspaceState />
        <UpdateInspect />
      </Stack>
    </>
  )
}
