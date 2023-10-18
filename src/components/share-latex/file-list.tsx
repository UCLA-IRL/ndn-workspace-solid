import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Link } from '@suid/material'
import FolderIcon from '@suid/icons-material/Folder';
import DescriptionIcon from '@suid/icons-material/Description'
import FilePresentIcon from '@suid/icons-material/FilePresent'
import { ProjFileDesc, ProjFolder } from '../../backend/models'
import { Link as RouterLink } from '@solidjs/router'
import { For, Match, Switch } from 'solid-js';

export default function FileList(props: {
  pathUri: string,
  folder: ProjFolder,
}) {
  const getItemIcon = (item: ProjFileDesc) => (
    <Switch fallback={(<></>)}>
      <Match when={item?.kind === 'folder'}>
        <FolderIcon />
      </Match>
      <Match when={item?.kind === 'doc'}>
        <DescriptionIcon />
      </Match>
      <Match when={item?.kind === 'blob'}>
        <FilePresentIcon />
      </Match>
    </Switch>
  )

  const getItemLink = (item: ProjFileDesc) => {
    const to = () => props.pathUri + '/' + item?.name
    return (<Link
      underline='hover'
      sx={{ display: 'flex', alignItems: 'left' }}
      color="inherit"
      component={RouterLink}
      href={to()}>
      {getItemIcon(item)}
      {item?.name}
    </Link>)
  }

  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell align="right">Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <For each={props.folder.items}>{(item =>
            <TableRow
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <TableCell component="th" scope="row">
                {getItemLink(item)}
              </TableCell>
              <TableCell align="right">
                N/A
              </TableCell>
            </TableRow>)}
          </For>
        </TableBody>
      </Table>
    </TableContainer>
  )
}
