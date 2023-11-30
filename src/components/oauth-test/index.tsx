import { Button, Stack, TextField } from "@suid/material"
import { createSignal, createUniqueId, onCleanup } from "solid-js"
import { GoogleOAuthClientId, GitHubOAuthClientId } from "../../constants"

export default function OauthTest() {
  const [requestId, setRequestId] = createSignal('')
  const [accessCode, setAccessCode] = createSignal('')
  // Official way should be useLocation, but I don't think we need it if we only uses the origin
  const basePath = location.origin  // === `${location.protocol}//${location.host}`
  const redirectTarget = `${basePath}/oidc-redirected.html`
  const channel = new BroadcastChannel('oauth-test')

  onCleanup(() => {
    channel.close()
  })

  channel.addEventListener("message", (event) => {
    const data = event.data
    if (data.state === requestId()) {
      console.log(`Access code: ${data.code}`)
      setAccessCode(data.code)
    } else {
      console.error(`Unknown redirection: ${data.state}`)
    }
  })

  const onClickGoogle = () => {
    setRequestId(createUniqueId())
    const queryStr = new URLSearchParams({
      scope: 'openid https://www.googleapis.com/auth/userinfo.email',
      redirect_uri: redirectTarget,
      response_type: 'code',
      client_id: GoogleOAuthClientId,
      state: requestId(),
      access_type: 'offline',
    }).toString()
    const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + queryStr
    window.open(url)  // TODO: not working on Safari
  }


  const onClickGithub = () => {
    setRequestId(createUniqueId())
    const queryStr = new URLSearchParams({
      scope: 'openid user:email',
      redirect_uri: redirectTarget,
      client_id: GitHubOAuthClientId,
      state: requestId(),
    }).toString()
    const url = 'https://github.com/login/oauth/authorize?' + queryStr
    window.open(url)  // TODO: not working on Safari
  }


  return <Stack direction="column" spacing={2}>
    <Button onClick={onClickGoogle} variant="outlined" color="secondary">
      Google
    </Button>
    <Button onClick={onClickGithub} variant="outlined" color="secondary">
      GitHub
    </Button>
    <TextField
      label="Access Code"
      name="access-code"
      type="text"
      inputProps={{
        readOnly: true,
      }}
      value={accessCode()}
    />
  </Stack>
}