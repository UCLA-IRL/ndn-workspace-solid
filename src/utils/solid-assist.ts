import { Accessor, createEffect, onCleanup } from "solid-js"

export function createInterval(callback: TimerHandler, delay: Accessor<number | undefined>) {
  createEffect(() => {
    const id = setInterval(callback, delay())
    onCleanup(() => clearInterval(id))
  })
}
