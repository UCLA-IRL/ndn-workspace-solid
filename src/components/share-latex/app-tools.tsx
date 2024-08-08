import { AppBar, Button, IconButton, Toolbar, Divider, MenuItem, Menu, Select } from '@suid/material'
import MenuIcon from '@suid/icons-material/Menu'
import PathBread from './path-bread'
import { createSignal, For, Switch, type JSX, Match, Accessor, Setter } from 'solid-js'
import { SelectChangeEvent } from '@suid/material/Select'
import { ViewValues } from './types'

export default function AppTools(props: {
  rootPath: string
  pathIds: string[]
  resolveName: (id: string) => string | undefined
  menuItems: Array<{ name: string; onClick?: () => void; icon?: JSX.Element }>
  onCompile: () => Promise<void>
  view: Accessor<ViewValues>
  setView: Setter<ViewValues>
}) {
  const [menuAnchor, setMenuAnchor] = createSignal<HTMLElement>()
  const menuOpen = () => menuAnchor() !== undefined

  const closeMenu = () => setMenuAnchor(undefined)
  const openMenu: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent> = (event) => {
    setMenuAnchor(event.currentTarget)
  }

  return (
    <AppBar position="relative" color="transparent" sx={{ boxShadow: 'none' }}>
      <Toolbar>
        <IconButton size="large" edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }} onClick={openMenu}>
          <MenuIcon />
        </IconButton>
        <div style={{ 'flex-grow': 1 }}>
          <PathBread
            rootPath={props.rootPath}
            pathIds={props.pathIds}
            resolveName={props.resolveName}
            setView={props.setView}
          />
        </div>
        <Button onClick={props.onCompile}>Compile</Button>
        <Select
          id="view-select"
          value={props.view()}
          onChange={(event: SelectChangeEvent) => props.setView(event.target.value as ViewValues)}
        >
          <MenuItem value="Editor">Editor</MenuItem>
          <MenuItem value="PDF">PDF</MenuItem>
          <MenuItem value="Both">Both</MenuItem>
          <MenuItem value="Log">Log</MenuItem>
        </Select>
      </Toolbar>

      <Menu anchorEl={menuAnchor()} open={menuOpen()} onClose={closeMenu}>
        <For each={props.menuItems}>
          {({ name, onClick, icon }) => (
            <Switch>
              <Match when={name === 'divider'}>
                <Divider sx={{ my: 0.5 }} />
              </Match>
              <Match when={true}>
                <MenuItem
                  onClick={() => {
                    closeMenu()
                    onClick?.call(onClick)
                  }}
                  disableRipple
                >
                  {icon}
                  {name}
                </MenuItem>
              </Match>
            </Switch>
          )}
        </For>
      </Menu>
    </AppBar>
  )
}
