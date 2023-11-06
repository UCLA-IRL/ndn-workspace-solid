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
//QR code imports
import CertQrCode from "./qr-gen"; // Adjust the import path as needed


import {
  PersonAdd as PersonAddIcon,
  PlayArrow as PlayArrowIcon,
  QrCode as QRIcon,
  Delete as DeleteIcon,
} from '@suid/icons-material'
import { Profile, profileToBootParams } from "../../backend/profile"
import { For, createEffect, createSignal } from "solid-js"
import { loadProfiles, removeProfile } from "../../backend/main"  // TODO: Should not depend on main
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
    loadProfiles().then(items => setProfiles(items))
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
      removeProfile(item.nodeId)
        .then(() => loadProfiles())
        .then(items => setProfiles(items))
    }
  }

  const [isPopupOpen, setPopupOpen] = createSignal(false);

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
        <IconButton onClick={() => setPopupOpen(!isPopupOpen())} sx={{visibility: booted() ? 'visible' : 'hidden'}}>
          <QRIcon color="primary"/>
        </IconButton>
        <IconButton onClick={() => navigate('/workspace', { replace: true })}>
          <PersonAddIcon color="primary" />
        </IconButton>
      </Toolbar>
      {isPopupOpen() && (
        <div class="popup">
          <CertQrCode value="Bv0BPQc0CA1uZG4td29ya3NwYWNlCAR0ZXN0CANLRVkICFJS7LZ8gfUFCARzZWxm
NggAAAGLZIrN/xQJGAECGQQANu6AFVswWTATBgcqhkjOPQIBBggqhkjOPQMBBwNC
AATxuBAe/TYwLQ9e8Zt4cEXW1NPYAW3uooS+ZXTWeqLaXWF8Rlj4CzVzX8SPYiV8
peenggFj5b3qEuMiBPlDQblvFlUbAQMcJgckCA1uZG4td29ya3NwYWNlCAR0ZXN0
CANLRVkICFJS7LZ8gfUF/QD9Jv0A/g8yMDIzMTAyNVQwMTU1MDD9AP8PMjA0MzEw
MjBUMDE1NTAwF0YwRAIgRWW2rafR0vHSsA7uAeb78nSFUPxO0gAwl9KKMzJwuJgC
IEi9gc1gaM3/GYatfQUytQhvOnFxEEnWx+q4MxK7+Knh" />
        </div>
        )}
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
