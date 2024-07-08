import { Show, createEffect, createSignal } from 'solid-js'
import * as qrcode from 'qrcode'

export default function CertQrCode(props: { value: string }) {
  const [qrCodeData, setQRCodeData] = createSignal('')

  createEffect(() => {
    if (props.value) {
      qrcode.toDataURL(props.value, { errorCorrectionLevel: 'M' }, (error, dataUrl) => {
        if (error) {
          console.error('Unable to generate QRCode:', error)
        } else {
          setQRCodeData(dataUrl)
        }
      })
    }
  })

  return (
    <Show when={qrCodeData() !== ''}>
      <img src={qrCodeData()} alt="QR Code" />
    </Show>
  )
}
