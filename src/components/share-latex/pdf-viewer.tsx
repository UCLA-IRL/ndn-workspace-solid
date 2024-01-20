import { usePDFSlick } from "@pdfslick/solid"
import { createEffect } from "solid-js"

export default function PdfViewer(props: {
  pdfUrl: string
}) {
  const {
    viewerRef,
    pdfSlickStore: store,
    PDFSlickViewer,
    // URL is only used in a createEffect scope internally.
    // eslint-disable-next-line solid/reactivity
  } = usePDFSlick(props.pdfUrl, {})

  createEffect(() => {
    // This requires a patch to pdfjs (see patches folder)
    // https://github.com/mozilla/pdf.js/pull/17445 (contributed upstream)
    // This also reloads the worker every time, but no big deal due to caching
    if (store.url && store.url !== props.pdfUrl) {
      store.pdfSlick?.loadDocument(props.pdfUrl)
    }
  });

  return <div class="inset-0 pdfSlick h-full" >
      <PDFSlickViewer {...{ store, viewerRef }} class="h-full" />
  </div >
}
