
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
import DescriptionIcon from "@suid/icons-material/Description"
import ViewInArIcon from '@suid/icons-material/ViewInAr'
import { createTheme, ThemeProvider } from "@suid/material/styles"
import { Outlet, Link } from "@solidjs/router"

const drawerWidth = 200;

export default function Root() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
  const darkTheme = createTheme({
    palette: {
      mode: prefersDarkMode() ? "dark" : "light"
    },
  })

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
            <ListItem disablePadding>
              <ListItemButton component={Link} href='/latex'>
                <ListItemIcon>
                  <DescriptionIcon />
                </ListItemIcon>
                <ListItemText primary='LaTeX' />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={Link} href='/aframe'>
                <ListItemIcon>
                  <ViewInArIcon />
                </ListItemIcon>
                <ListItemText primary='A-Frame' />
              </ListItemButton>
            </ListItem>
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