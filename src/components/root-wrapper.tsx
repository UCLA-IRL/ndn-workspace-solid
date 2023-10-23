
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CssBaseline,
  useMediaQuery
} from "@suid/material"
import {
  Description as DescriptionIcon,
  ViewInAr as ViewInArIcon,
  Apps as AppsIcon,
} from "@suid/icons-material"
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
  const darkTheme = createTheme({
    palette: {
      mode: prefersDarkMode() ? "dark" : "light"
    },
  })

  // TODO: MUI's Tab may be better?
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
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
          sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3, minHeight: '100vh' }}
        >
          <Outlet />
        </Box>
      </Box>
    </ThemeProvider>
  )
}