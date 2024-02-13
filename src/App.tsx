import { Button, Paper, Typography } from '@suid/material'
import { useNdnWorkspace, initTestbed } from './Context'
import { useNavigate } from '@solidjs/router'

function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}

function App() {
  const { currentConnConfig } = useNdnWorkspace()!
  const navigate = useNavigate()

  initTestbed()

  const configToDescription = () => {
    const config = currentConnConfig()
    if (!config) {
      return <div>Finding closest NDN forwarder</div>
    } else if (config.kind === 'peerJs') {
      return (
        <div>
          <div>Connected to PeerJS</div>
          <div style={{ 'font-weight': 300 }}>{config.host}</div>
        </div>
      )
    } else {
      return (
        <div>
          <div>Connected to NDN forwarder</div>
          <div style={{ 'font-weight': 300 }}>{config.uri}</div>
        </div>
      )
    }
  }

  return (
    <Paper
      elevation={0}
      sx={{
        px: 3,
        py: 2,
        mx: 'auto',
        minWidth: '100%',
        maxWidth: '560px',
        textAlign: 'left',
      }}
    >
      <Typography variant="h3" sx={{ mt: 5, my: 3, fontWeight: 100 }}>
        Workspace
      </Typography>

      <>
        <Typography variant="h5" sx={{ m: 0, my: 2, fontWeight: 100 }}>
          Collaborative LaTeX editor for the decentralized Internet
        </Typography>

        <Typography variant="body1" sx={{ my: 2 }}>
          Workspace is a decentralized LaTeX and document editor that allows you to collaborate with others without
          depending on a third-party service. It is built with Named Data Networking and runs over the global NDN
          testbed infrastructure, operated in collaboration by universities and research institutions around the world.
        </Typography>

        <Typography variant="body1" sx={{ my: 3 }}>
          <Button
            onClick={() => navigate('/profile', { replace: true })}
            variant="contained"
            color="primary"
            size="large"
          >
            Create or Join a Workspace
          </Button>
        </Typography>
      </>

      <>
        <hr />
        <Typography variant="body1" sx={{ m: 3, fontSize: '1.1em' }}>
          {configToDescription()}

          {isSafari() && (
            <div>
              {' '}
              <hr /> Safari is currently not well-supported. Please prefer using Chrome, Firefox, or Edge.{' '}
            </div>
          )}
        </Typography>
        <hr />
      </>

      <>
        <Typography variant="h4" sx={{ mt: 8, mb: 2, fontWeight: 100 }}>
          Quick Overview
        </Typography>

        <Typography variant="body1" sx={{ my: 2 }}>
          Workspace is a fully decentralized Latex editor where <i>you control your data</i>. When you use workspace,
          all your data is only stored in your own browser and the browsers of your collaborators.
          <ul>
            <li>Fully decentralized, no third-party service involved</li>
            <li>No download required, Workspace runs completely in the browser</li>
            <li>Live collaborative editing of documents with multiple users</li>
            <li>In-browser Latex compilation and preview</li>
          </ul>
          To enable collaboration in a decentralized manner, Workspace uses the Named Data Networking (NDN) protocols.
          All collaborators in a workspace are connected to each other using the global NDN testbed or local NDN
          infrastructure. Workspace then uses the State Vector Sync protocol to keep all collaborators in sync.
        </Typography>

        <Button href="https://named-data.net/" variant="contained" color="primary">
          Learn More about NDN
        </Button>
      </>

      <>
        <Typography variant="h4" sx={{ mt: 8, mb: 2, fontWeight: 100 }}>
          Getting Started
        </Typography>

        <Typography variant="body1" sx={{ my: 2 }}>
          To start using Workspace, you need to create or join a workspace. Each workspace is a decentralized virtual
          folder where you can collaborate with others.
          <Typography variant="h5" sx={{ my: 2, fontWeight: 100 }}>
            Connecting to the NDN Testbed
          </Typography>
          The NDN testbed provides the packet forwarding infrastructure for Workspace. You can connect to the testbed by
          obtaining a testbed certificate using your email address.
          <ol>
            <li>Open the connection tab in Workspace</li>
            <li>Click on "Add" button</li>
            <li>Click the "Reach Testbed" button to find the closest NDN node</li>
            <li>Enter your email address and click on "Request" to receive a verification code</li>
            <li>Email verification code and click "Get Cert" to obtain a testbed certificate</li>
          </ol>
          You can now connect to the testbed node using the connections page. Opening Workspace will also automatically
          connect to the closest testbed node by default.
          <Typography variant="h5" sx={{ my: 2, fontWeight: 100 }}>
            Bootstrapping a Workspace
          </Typography>
          To join an existing Workspace, perform the following steps after ensuring you are connected to the NDN
          testbed.
          <ol>
            <li>Open the "Workspace" tab</li>
            <li>Click on the "Convert" button</li>
            <li>Enter the full trust anchor name of the workspace</li>
            <li>Click on the "Join" button</li>
          </ol>
          You can now join the workspace any time from the "Workspace" tab, and start collaborating on documents in the
          "Editor" tab.
        </Typography>
      </>

      <>
        <Typography variant="h4" sx={{ mt: 8, mb: 2, fontWeight: 100 }}>
          Contribute
        </Typography>

        <Typography variant="body1" sx={{ my: 2 }}>
          Like most of the NDN software, Workspace is open-source and free to use. You can contribute to the project by
          reporting bugs, suggesting features, or submitting pull requests. The source code is available on GitHub under
          the UCLA-IRL organization.
          <br />
          <br />
          <b>If you have any questions or need help, feel free to file an issue on the GitHub repository.</b>
        </Typography>
      </>

      <Typography variant="body1" sx={{ my: 3 }}>
        <Button href="https://github.com/UCLA-IRL/ndn-workspace-solid" variant="contained" color="primary">
          GitHub Repository
        </Button>

        <Button
          href="https://github.com/UCLA-IRL/ndn-workspace-solid/wiki"
          sx={{ ml: 2 }}
          variant="contained"
          color="primary"
        >
          Project Wiki
        </Button>
      </Typography>
    </Paper>
  )
}

export default App
