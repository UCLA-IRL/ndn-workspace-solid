import { Breadcrumbs, Link, Typography } from '@suid/material'
import { Link as RouterLink } from '@solidjs/router'
import HomeIcon from '@suid/icons-material/Home'
import { For, Match, Show, Switch, createMemo } from 'solid-js'

export default function PathBread(props: {
  rootPath: string,
  pathNames: string[]
}) {
  const paths = createMemo(() => [props.rootPath, ...props.pathNames])

  return (
    <Breadcrumbs>
      <For each={paths()}>{(value, index) => {
        const isFirst = () => index() === 0
        const isLast = () => index() === paths().length - 1
        const to = () => `${paths().slice(0, index() + 1).join('/')}`
        return <Switch>
          <Match when={isLast()}>
            <Typography
              color="text.primary"
              sx={{ display: 'flex', alignItems: 'center' }}>
              <Show when={isFirst()} fallback={value}>
                <><HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" /> ROOT</>
              </Show>
            </Typography>
          </Match>
          <Match when={!isLast()}>
            <Link
              underline="hover"
              sx={{ display: 'flex', alignItems: 'center' }}
              color="inherit"
              component={RouterLink}
              href={to()}>
              <Show when={isFirst()} fallback={value}>
                <><HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" /> ROOT</>
              </Show>
            </Link>
          </Match>
        </Switch>
      }}</For>
    </Breadcrumbs>
  )
}
