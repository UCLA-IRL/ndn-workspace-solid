import { usePDFSlick } from "@pdfslick/solid"
import { createInterval } from "../../utils"
// import { createSignal, createEffect } from "solid-js"

export default function PdfViewer(props: {
  pdfUrl: string | undefined
}) {
  const {
    viewerRef,
    pdfSlickStore: store,
    PDFSlickViewer,
    // URL is only used in a createEffect scope internally.
    // eslint-disable-next-line solid/reactivity
  } = usePDFSlick(props.pdfUrl, {})

  createInterval(() => {
    // TODO: Need some CSS expert to find a better way
    const ele = document.getElementById('viewerContainer')
    if (ele) {
      ele.style.position = 'relative'
    }
  }, () => 100)

  return <div class="absolute inset-0 pdfSlick h-full">
      <PDFSlickViewer {...{ store, viewerRef }} class="h-full" />
  </div >
}
