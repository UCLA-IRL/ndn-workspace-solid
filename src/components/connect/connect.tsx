import { Stack } from "@suid/material"
import NfdWebsocket from "./nfd-websocket"
import PeerJs from "./peer-js"

export default function Connect() {
  return <Stack spacing={2}>
    <NfdWebsocket />
    <PeerJs />
  </Stack>
}
