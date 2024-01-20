import { Paper, Typography } from '@suid/material'
import '@pdfslick/solid/dist/pdf_viewer.css'
import { useNdnWorkspace, initTestbed } from './Context'

function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}

function App() {
  const { currentConnConfig } = useNdnWorkspace()!

  initTestbed()

  const configToDescription = () => {
    const config = currentConnConfig()
    if (!config) {
      return 'Finding closest NDN forwarder'
    } else if (config.kind === 'peerJs') {
      return `PeerJS: ${config.host}`
    } else {
      return `NDN forwarder: ${config.uri}`
    }
  }

  return (
    <Paper
      elevation={0}
      sx={{
        px: 3,
        py: 2,
        mx: 'auto',
        minWidth: '40%',
        maxWidth: '560px',
        textAlign: 'center',
      }}
    >
      <Typography variant="h3" sx={{ m: 2, mt: 0, fontWeight: 100 }}>
        Workspace
      </Typography>

      <Typography variant="h5" sx={{ m: 2, mt: 0, fontWeight: 100 }}>
        Collaborative LaTeX editor for the decentralized Internet
      </Typography>

      <Typography variant="body1">{configToDescription()}</Typography>

      <Typography variant="body1">
        <br />
        Workspace is a decentralized LaTeX editor that allows you to collaborate with others without depending on a
        third-party service. It is built with <a href="https://named-data.net">Named Data Networking</a> and runs over
        the global NDN testbed infrastructure, operated in collaboration by universities and research institutions
        around the world.
        <br />
        <br />
        See the <a href="https://github.com/UCLA-IRL/ndn-workspace-solid/wiki">project wiki</a> for help.
        {isSafari() && (
          <>
            <br />
            <br /> Safari is currently not well-supported. Please prefer using Chrome, Firefox, or Edge.
          </>
        )}
      </Typography>
    </Paper>
  )
}

export default App
