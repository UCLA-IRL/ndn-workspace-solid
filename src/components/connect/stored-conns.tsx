import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from "@suid/material"
import {
  Delete as DeleteIcon,
} from '@suid/icons-material'
import { For, createEffect, createMemo, createSignal } from "solid-js"
import { connections as db, Config as Conn, getName } from '../../backend/models/connections'
import { useNdnWorkspace } from "../../Context"
import ConnButton from "./conn-button"
import { useNavigate } from "@solidjs/router"

/** A component listing stored connectivity profiles */
export default function StoredConns() {
  const navigate = useNavigate()
  const [conns, setConns] = createSignal<Conn[]>([])
  const {
    connectFuncs: { connect, disconnect },
    connectionStatus: connStatus,
    currentConnConfig: curConf,
  } = useNdnWorkspace()!
  const curConfigName = createMemo(() => getName(curConf()))

  createEffect(() => {
    db.loadAll().then(items => setConns(items))
  })

  const onRun = (id: number) => {
    const item = conns()[id]
    if (item !== undefined) {
      connect(item)
    }
  }

  const onRemove = (id: number) => {
    const item = conns()[id]
    if (item !== undefined) {
      db.remove(getName(item))
        .then(() => db.loadAll())
        .then(items => setConns(items))
    }
  }

  const onStop = () => {
    disconnect()
  }

  return <Card>
    <CardHeader
      sx={{ textAlign: 'left' }}
      title="Stored Connections"
    />
    <CardContent>
      <TableContainer>
        <Table sx={{ minWidth: 300 }}>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <For each={conns()}>{(item, i) =>
              <TableRow>
                <TableCell
                  component="th"
                  scope="row"
                >
                  <Typography fontFamily='"Roboto Mono", ui-monospace, monospace' component="span">
                    {getName(item)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <ConnButton
                    isCur={curConfigName() == getName(item)}
                    state={connStatus()}
                    onConnect={() => onRun(i())}
                    onDisonnect={() => onStop()}
                  />
                  <IconButton color="error" onClick={() => { onRemove(i()) }}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            }</For>
          </TableBody>
        </Table>
      </TableContainer>
    </CardContent>
    <CardActions sx={{ justifyContent: 'flex-end' }}>
      <Button variant="text" color="primary" onClick={() => { navigate('/connection/add', { replace: true }) }}>
        ADD
      </Button>
    </CardActions>
  </Card>
}
