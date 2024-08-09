import { Breadcrumbs, Link, Typography } from '@suid/material'
import HomeIcon from '@suid/icons-material/Home'
import { For, Match, Show, Switch, Setter } from 'solid-js'
import { ViewValues } from './types'

export default function PathBread(props: {
  rootPath: string
  pathIds: string[]
  resolveName: (id: string) => string | undefined
  setView: Setter<ViewValues>
}) {
  return (
    <Breadcrumbs>
      <For each={props.pathIds}>
        {(value, index) => {
          const isFirst = () => index() === 0
          const isLast = () => index() === props.pathIds.length - 1
          const to = () => props.rootPath + '/' + value

          const handleClick = () => {
            // Force Setview to Editor after click path
            props.setView('Editor')
          }

          return (
            <Switch>
              <Match when={isLast()}>
                <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
                  <Show when={isFirst()} fallback={props.resolveName(value)}>
                    <>
                      <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" /> ROOT
                    </>
                  </Show>
                </Typography>
              </Match>
              <Match when={!isLast()}>
                <Link
                  underline="hover"
                  sx={{ display: 'flex', alignItems: 'center' }}
                  color="inherit"
                  href={to()}
                  onClick={handleClick}
                >
                  <Show when={isFirst()} fallback={props.resolveName(value)}>
                    <>
                      <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" /> ROOT
                    </>
                  </Show>
                </Link>
              </Match>
            </Switch>
          )
        }}
      </For>
    </Breadcrumbs>
  )
}
