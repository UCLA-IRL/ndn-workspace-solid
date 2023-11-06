import { createEffect, createSignal, onCleanup } from "solid-js";
import * as qrcode from "qrcode";

export default function CertQrCode({ value }: { value: string }) {
  const [qrCodeData, setQRCodeData] = createSignal<string | null>(null);

  createEffect(() => {
    if (value) {
      const canvas = document.createElement("canvas");
      qrcode.toCanvas(
        canvas,
        value,
        {
          errorCorrectionLevel: "L",
        },
        function (error) {
          if (error) {
            console.error(`Unable to generate QRCode: ${error}`);
          } else {
            setQRCodeData(canvas.toDataURL());
          }
        }
      );
    }
  });

  // Cleanup the QR code data when the component is unmounted
  onCleanup(() => setQRCodeData(null));

  return (
    <div>
      {qrCodeData() && <img src={qrCodeData()} alt="QR Code" />}
    </div>
  );
}
