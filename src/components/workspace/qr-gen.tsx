import { createEffect, createSignal } from "solid-js";
import * as qrcode from "qrcode";

export default function CertQrCode({ value }: { value: string }) {
  const [qrCodeData, setQRCodeData] = createSignal<string | null>(null);

  createEffect(() => {
    if (value) {
      qrcode.toDataURL(
        value,
        {
          errorCorrectionLevel: "L",
        },
        function (error, dataUrl) {
          if (error) {
            console.error(`Unable to generate QRCode: ${error}`);
          } else {
            setQRCodeData(dataUrl);
          }
        }
      );
    }
  });

  return (
    <div>
      {qrCodeData() && <img src={qrCodeData()} alt="QR Code" />}
    </div>
  );
}
