import { Typography } from "@suid/material"
import "@pdfslick/solid/dist/pdf_viewer.css";

function App() {
  return (
    <>
      <Typography variant='h3'>NDN Workspace Prototype</Typography>
      <Typography variant='h4'>Quick Notes</Typography>
      <Typography variant='body1'>
        - Every browser tab is a new node. Do not reuse credentials.
      </Typography>
      <Typography variant='body1'>
        - Chrome 119 and Edge 119 are recommended. In Firefox 119, a small set of functions are supported.
          We do not guarantee Safari to work.
      </Typography>
      <Typography variant='body1'>
        - See <a href='https://github.com/UCLA-IRL/ndn-workspace-solid/wiki'>Wiki</a> for help.
      </Typography>
    </>
  )
}

export default App
