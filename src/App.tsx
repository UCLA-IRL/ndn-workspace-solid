import { Typography } from "@suid/material"

function App() {
  return (
    <>
      <Typography variant='h3'>NDN Workspace Prototype</Typography>
      <Typography variant='h4'>Quick Notes</Typography>
      <Typography variant='body1'>
        - Every browser tab is a new node. Do not reuse credentials.
      </Typography>
      <Typography variant='body1'>
        - Chrome {">"}=111 and Edge {">"}=111 are recommended. In Firefox {">"}=111, a small set of functions are supported.
          We do not test on Safari.
      </Typography>
      <Typography variant='body1'>
        - See <a href='https://github.com/UCLA-IRL/ndn-workspace-solid/wiki'>Wiki</a> for help.
      </Typography>
    </>
  )
}

export default App
