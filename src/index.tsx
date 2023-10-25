/* @refresh reload */
import { render } from 'solid-js/web'
import { Router, Route, Routes } from "@solidjs/router"
// import 'solid-devtools'

import {
  Description as DescriptionIcon,
  ViewInAr as ViewInArIcon,
  Apps as AppsIcon,
  SettingsEthernet as SettingsEthernetIcon,
  Home as HomeIcon,
} from "@suid/icons-material"

// import './index.css'
import Root from './components/root-wrapper'
import App from './App'
import ShareLatex from './components/share-latex'
import Scene from './components/networked-aframe/scene'
import { NdnWorkspaceProvider } from './Context'
import Connect from './components/connect'
import Workspace from './components/workspace'

const root = document.getElementById('root')

render(
  () => (
    <NdnWorkspaceProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Root routes={[
            { icon: <HomeIcon />, href: '/', title: 'Home' },
            { icon: <AppsIcon />, href: '/workspace', title: 'Workspace' },
            { icon: <SettingsEthernetIcon />, href: '/connection', title: 'Connection' },
            { icon: <DescriptionIcon />, href: '/latex', title: 'LaTeX' },
            { icon: <ViewInArIcon />, href: '/aframe', title: 'A-Frame' },
          ]} />} >
            <Route path="/" component={App} />
            <Route path="/latex/*path" element={<ShareLatex rootUri='/latex' />} />
            <Route path="/aframe" component={Scene} />
            <Route path="/connection" component={Connect} />
            <Route path="/workspace" component={Workspace} />
          </Route>
        </Routes>
      </Router>
    </NdnWorkspaceProvider>
  ),
  root!
)
