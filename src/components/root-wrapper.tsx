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
} from "@suid/material"
import { createTheme, ThemeProvider } from "@suid/material/styles"
import { Outlet, Link } from "@solidjs/router"
import { For, JSX } from "solid-js";

const drawerWidth = 200;

function RouteItem(props: { icon: JSX.Element, title: string, href: string }) {
  return (
    <ListItem disablePadding>
      <ListItemButton component={Link} href={props.href}>
        <ListItemIcon>
          {props.icon}
        </ListItemIcon>
        <ListItemText primary={props.title} />
      </ListItemButton>
    </ListItem>
  )
}

export default function Root(props: {
  routes: Array<{ icon: JSX.Element, title: string, href: string }>
}) {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
  const theme = createTheme({
    palette: {
      mode: prefersDarkMode() ? "dark" : "light"
    },
  })

  // TODO: MUI's Tab may be better?
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{
        '--md-sys-color-primary': theme.palette.primary.main,
        '--md-sys-color-on-primary': theme.palette.primary.contrastText,
        '--md-sys-color-primary-container': theme.palette.primary.light,
        '--md-sys-color-on-primary-container': theme.palette.primary.contrastText,
        '--md-sys-color-secondary': theme.palette.secondary.main,
        '--md-sys-color-on-secondary': theme.palette.secondary.contrastText,
        '--md-sys-color-secondary-container': theme.palette.secondary.light,
        '--md-sys-color-on-secondary-container': theme.palette.secondary.contrastText,
        '--md-sys-color-tertiary': theme.palette.info.main,
        '--md-sys-color-on-tertiary': theme.palette.info.contrastText,
        '--md-sys-color-tertiary-container': theme.palette.info.light,
        '--md-sys-color-on-tertiary-container': theme.palette.info.contrastText,
        '--md-sys-color-error': theme.palette.error.main,
        '--md-sys-color-on-error': theme.palette.error.contrastText,
        '--md-sys-color-error-container': theme.palette.error.light,
        '--md-sys-color-on-error-container': theme.palette.error.contrastText,
        '--md-sys-color-background': theme.palette.background.default,
        '--md-sys-color-on-background': theme.palette.text.primary,
        '--md-sys-color-surface': theme.palette.background.paper,
        '--md-sys-color-on-surface': theme.palette.text.primary,
        '--md-sys-color-shadow': theme.palette.primary.main,
        '--md-elevation-level': 0,
        '--theme-color-success': theme.palette.success.main,
        '--theme-color-grey-600': theme.palette.grey[600],
      }}>
        <Box sx={{ display: 'flex' }}>
          <Drawer
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: drawerWidth,
                boxSizing: 'border-box',
              },
            }}
            variant="permanent"
            anchor="left"
          >
            <List>
              <For each={props.routes}>{item =>
                <RouteItem icon={item.icon} href={item.href} title={item.title} />
              }</For>
            </List>
          </Drawer>
          <Box
            component="main"
            sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3, minHeight: '100vh', overflowX: 'hidden' }}
          >
            <Outlet />
          </Box>
        </Box>
      </div>
    </ThemeProvider>
  )
}