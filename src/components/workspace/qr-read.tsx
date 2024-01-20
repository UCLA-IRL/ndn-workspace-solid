import QrScanner from 'qr-scanner'
import { Show, createEffect, createSignal, onCleanup } from 'solid-js'

export default function QrReader(props: {
  //open or close video stream
  popupOpen: boolean
  setValue: (value: string) => void
}) {
  const [videoElem, setVideoElem] = createSignal<HTMLVideoElement>()

  //running the QR code scanner
  createEffect(() => {
    const vid = videoElem()
    const setValue = props.setValue
    if (props.popupOpen && vid) {
      const scanner = new QrScanner(
        vid,
        (result) => {
          console.debug('Scanned QR code:', result)
          setValue(result.data)
          scanner.stop()
        },
        { returnDetailedScanResult: true },
      )
      scanner.start()
      onCleanup(() => {
        scanner.stop()
      })
    }
  })

  return (
    <Show when={props.popupOpen}>
      <video ref={setVideoElem} />
    </Show>
  )
}
