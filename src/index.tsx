/* @refresh reload */
import { render } from 'solid-js/web'
import { Router, Route, Routes } from "@solidjs/router"

// import './index.css'
import Root from './components/root-wrapper'
import App from './App'
import ShareLatex from './components/share-latex/share-latex'
import Scene from './components/networked-aframe/scene'
import { NdnWorkspaceProvider } from './Context'

const root = document.getElementById('root')

render(
  () => (
    <NdnWorkspaceProvider>
      <Router>
        <Routes>
          <Route path="/" component={Root} >
            <Route path="/" component={App} />
            <Route path="/latex/*path" element={<ShareLatex rootUri='/latex' />} />
            <Route path="/aframe" component={Scene} />
          </Route>
        </Routes>
      </Router>
    </NdnWorkspaceProvider>
  ),
  root!
)
