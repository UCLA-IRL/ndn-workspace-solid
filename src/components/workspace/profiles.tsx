import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Toolbar,
  Typography,
  IconButton,
} from "@suid/material"
import {
  PersonAdd as PersonAddIcon,
  PlayArrow as PlayArrowIcon,
  Delete as DeleteIcon,
} from '@suid/icons-material'
import { Profile, toBootParams as profileToBootParams, profiles as db } from "../../backend/models/profiles"
import { For, createEffect, createSignal } from "solid-js"
import { useNdnWorkspace } from "../../Context"
import { useNavigate } from "@solidjs/router"

export default function Profiles() {
  const {
    booted,
    bootstrapWorkspace,
  } = useNdnWorkspace()!
  const [profiles, setProfiles] = createSignal<Profile[]>([])
  const navigate = useNavigate()

  createEffect(() => {
    db.loadAll().then(items => setProfiles(items))
  })

  createEffect(() => {
    if (booted()) {
      navigate('/workspace', { replace: true })
    }
  })

  const onRun = (id: number) => {
    const item = profiles()[id]
    if (item !== undefined) {
      const params = profileToBootParams(item)
      bootstrapWorkspace({ ...params, createNew: false }).then(() => {
        navigate('/workspace', { replace: true })
      })
    }
  }

  const onRemove = (id: number) => {
    const item = profiles()[id]
    if (item !== undefined) {
      db.remove(item.nodeId)
        .then(() => db.loadAll())
        .then(items => setProfiles(items))
    }
  }

  return (<Box sx={{ width: '100%' }}>
    <Paper sx={{ width: '100%', mb: 2 }}>
      <Toolbar>
        <Typography
          sx={{ flex: '1 1 100%' }}
          variant="h6"
          component="div"
        >
          Profiles
        </Typography>
        <IconButton onClick={() => navigate('/workspace', { replace: true })}>
          <PersonAddIcon color="primary" />
        </IconButton>
      </Toolbar>
      <TableContainer>
        <Table sx={{ minWidth: 300 }}>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <For each={profiles()}>{(item, i) =>
              <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell
                  component="th"
                  scope="row"
                >
                  <Typography color="primary" fontFamily='"Roboto Mono", ui-monospace, monospace' component="span">
                    {item.workspaceName}
                  </Typography>
                  <Typography fontFamily='"Roboto Mono", ui-monospace, monospace' component="span">
                    {item.nodeId.substring(item.workspaceName.length)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => { onRun(i()) }}>
                    <PlayArrowIcon color="success" />
                  </IconButton>
                  <IconButton onClick={() => { onRemove(i()) }}>
                    <DeleteIcon color="error" />
                  </IconButton>
                </TableCell>
              </TableRow>
            }</For>
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  </Box>)
}
