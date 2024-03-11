import { onMount, createSignal } from 'solid-js'
import { REVISION, TIMESTAMP } from '../../../build-meta'

export default function VersionTable() {
  const [rev, setRev] = createSignal<string>()
  const [times, setTimes] = createSignal<number>()

  onMount(async () => {
    try {
      const response = await fetch(`${location.origin}/build-meta.json`)
      const json = await response.json()
      setRev(json['revision'])
      setTimes(json['timestamp'])
    } catch {
      // Ignore errors
    }
  })

  return (
    <>
      <h2>Versions</h2>
      <p>
        Running build: <code>{REVISION}</code> {new Date(TIMESTAMP * 1000).toLocaleString()}
      </p>
      <p>
        Remote build: <code>{rev() ?? 'UNKNOWN'}</code>{' '}
        {times() ? new Date(times()! * 1000).toLocaleString() : 'UNKNOWN'}
      </p>
    </>
  )
}
