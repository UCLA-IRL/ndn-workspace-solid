import QrScanner from 'qr-scanner';
import { createEffect, onCleanup } from 'solid-js';

export default function QrReader(props)
{
    let vid;
    createEffect(() => {
        const scanner = new QrScanner(vid, handleQRread,
        { returnDetailedScanResult: true});
        //scanner.start();

        props.visible ? scanner.start() : scanner.stop();

        onCleanup(() => {
            scanner.stop();
        });
    });


    function handleQRread(result) {
    console.log('Scanned QR code:', result);
    // Do something with the result, e.g., update state or perform an action.
    }


    return(
        <video ref={vid}></video>
    );
}
