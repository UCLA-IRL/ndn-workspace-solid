import { Component } from 'solid-js'

interface PDFViewerProps {
  pdfUrl: string
  width?: string
  height?: string
}

const PDFViewer: Component<PDFViewerProps> = (props) => {
  return (
    <iframe
      src={props.pdfUrl}
      width={props.width || '100%'}
      height={props.height || '800px'}
      style={{ border: 'none' }}
      title="PDF Viewer"
    />
  )
}

export default PDFViewer
