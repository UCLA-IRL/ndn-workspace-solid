import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CssBaseline,
  useMediaQuery,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Stack,
} from '@suid/material'
import { Breakpoint, createTheme, Theme, ThemeProvider } from '@suid/material/styles'
import { For, JSX, ParentProps, Show } from 'solid-js'
import { useNdnWorkspace } from '../Context'
import { Portal } from 'solid-js/web'

import './common.scss'

const drawerWidth = 200
const navBarHeight = 56

function RouteItem(props: { icon: JSX.Element; title: string; href: string; level?: number; trigger?: () => boolean }) {
  const { icon, title, href, level = 0, trigger = () => true } = props

  // Left margins
  const marginLeft = `${level * 16}px`

  return (
    <ListItem disablePadding>
      <Show when={level >= 1 && trigger()}>
        <ListItemButton
          component="a"
          href={href}
          sx={{
            marginLeft,
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '2px',
              backgroundColor: 'white',
            },
          }}
        >
          <ListItemIcon sx={{ color: 'inherit' }}>{icon}</ListItemIcon>
          <ListItemText primary={title} />
        </ListItemButton>
      </Show>
      <Show when={level == 0 && trigger()}>
        <ListItemButton component="a" href={href}>
          <ListItemIcon sx={{ color: 'inherit' }}>{icon}</ListItemIcon>
          <ListItemText primary={title} />
        </ListItemButton>
      </Show>
    </ListItem>
  ) // If level < 0, not displayed
}

const ColorVariables = (props: { theme: Theme<Breakpoint> }) => (
  <style>{`
:root {
  --md-sys-color-primary: ${props.theme.palette.primary.main};
  --md-sys-color-on-primary: ${props.theme.palette.primary.contrastText};
  --md-sys-color-primary-container: ${props.theme.palette.primary.light};
  --md-sys-color-on-primary-container: ${props.theme.palette.primary.contrastText};
  --md-sys-color-secondary: ${props.theme.palette.secondary.main};
  --md-sys-color-on-secondary: ${props.theme.palette.secondary.contrastText};
  --md-sys-color-secondary-container: ${props.theme.palette.secondary.light};
  --md-sys-color-on-secondary-container: ${props.theme.palette.secondary.contrastText};
  --md-sys-color-tertiary: ${props.theme.palette.info.main};
  --md-sys-color-on-tertiary: ${props.theme.palette.info.contrastText};
  --md-sys-color-tertiary-container: ${props.theme.palette.info.light};
  --md-sys-color-on-tertiary-container: ${props.theme.palette.info.contrastText};
  --md-sys-color-error: ${props.theme.palette.error.main};
  --md-sys-color-on-error: ${props.theme.palette.error.contrastText};
  --md-sys-color-error-container: ${props.theme.palette.error.light};
  --md-sys-color-on-error-container: ${props.theme.palette.error.contrastText};
  --md-sys-color-background: ${props.theme.palette.background.default};
  --md-sys-color-on-background: ${props.theme.palette.text.primary};
  --md-sys-color-surface: ${props.theme.palette.background.paper};
  --md-sys-color-on-surface: ${props.theme.palette.text.primary};
  --md-sys-color-shadow: ${props.theme.palette.primary.main};
  --md-elevation-level: ${0};
  --theme-color-success: ${props.theme.palette.success.main};
  --theme-color-success-container: ${props.theme.palette.success.light};
  --theme-color-grey-600: ${props.theme.palette.grey[600]};
}
`}</style>
)

export default function Root(
  props: ParentProps<{
    routes: Array<{
      icon: JSX.Element
      title: string
      href: string
      level?: number
      trigger?: () => boolean
    }>
  }>,
) {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
  // blue theme
  const theme = createTheme({
    palette: {
      mode: prefersDarkMode() ? 'dark' : 'light',
      background: {
        default: prefersDarkMode() ? '#121212' : '#F4F5F6',
        paper: prefersDarkMode() ? '#1E1E1E' : '#FFFFFF',
      },
      text: {
        primary: prefersDarkMode() ? '#FFFFFF' : '#000000',
        secondary: prefersDarkMode() ? '#FFFFFF' : '#000000',
      },
    },
  })
  const { setTheme } = useNdnWorkspace()!
  setTheme(theme)

  // TODO: MUI's Tab may be better?
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Portal mount={document.querySelector('head')!}>
        <ColorVariables theme={theme} />
      </Portal>
      <div>
        {/* The left navigation bar. Breakpoint: 0 <= xs <= 600px, 600px < sm,md <= 900,1200, 1200 <= lg  */}
        <Box sx={{ display: 'flex' }}>
          <Box component="nav" sx={{ width: { md: drawerWidth, xs: 0 }, flexShrink: 0 }} aria-label="navibar">
            <Drawer
              sx={{
                width: drawerWidth,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                  width: drawerWidth,
                  boxSizing: 'border-box',
                  backgroundColor: '#283593',
                  color: '#FFFFFF',
                },
                display: { md: 'block', xs: 'none' },
              }}
              variant="permanent"
              anchor="left"
            >
              <List>
                <For each={props.routes}>
                  {(item) => (
                    <RouteItem
                      icon={item.icon}
                      href={item.href}
                      title={item.title}
                      level={item.level}
                      trigger={item.trigger}
                    />
                  )}
                </For>
              </List>
            </Drawer>
          </Box>

          {/* The body */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              bgcolor: 'background.default',
              p: 2,
              height: { md: '100vh', xs: `calc(100vh - ${navBarHeight}px)` },
              marginBottom: { md: '0', xs: `${navBarHeight}px` },
              overflowX: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {props.children}
          </Box>

          {/* The bottom navigation bar */}
          <Paper
            elevation={3}
            sx={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              height: `${navBarHeight}px`,
              display: { md: 'none', xs: 'flex' },
              '& .MuiStack-root': {
                backgroundColor: '#283593',
                '*': {
                  color: '#FFFFFF',
                },
              },
            }}
          >
            <BottomNavigation
              showLabels
              sx={{
                display: { md: 'none', xs: 'flex' },
                width: '100%',
              }}
              component={Stack}
              direction="row"
              justifyContent="center"
            >
              <For each={props.routes}>
                {(item) => (
                  <BottomNavigationAction component="a" icon={item.icon} href={item.href} label={item.title} />
                )}
              </For>
            </BottomNavigation>
          </Paper>
        </Box>
      </div>
    </ThemeProvider>
  )
}
