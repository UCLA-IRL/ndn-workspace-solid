import { Stack } from "@suid/material"
import NfdWebsocket from "./nfd-websocket"
import PeerJs from "./peer-js"
import NdnTestbed from "./ndn-testbed"
import { connections as db, Config as Conn } from '../../backend/models/connections'
import { useNavigate } from "@solidjs/router"

export default function Connect() {
  const navigate = useNavigate()

  const onAdd = (config: Conn) => {
    db.save(config).then(() => navigate('/connection', { replace: true }))
  }

  return <Stack spacing={2}>
    <NdnTestbed onAdd={onAdd} />
    <NfdWebsocket onAdd={onAdd} />
    <PeerJs onAdd={onAdd} />
  </Stack>
}
