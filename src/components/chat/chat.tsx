import { createEffect, createSignal, For, on } from 'solid-js'
import { boxed } from '@syncedstore/core'
import { useNdnWorkspace } from '../../Context'
import { chats } from '../../backend/models'
import { createSyncedStoreSig } from '../../adaptors/solid-synced-store'
import styles from './styles.module.scss'

// TODO: Do not load all messages at once
// TODO: Support multiple channels
// TODO: Support Markdown

export function Chat() {
  const { rootDoc, syncAgent } = useNdnWorkspace()!
  const messages = createSyncedStoreSig(() => rootDoc()?.chats)
  const data = () => messages()?.value
  const username = () => syncAgent()?.nodeId.at(-1).text ?? ''

  const [messageTerm, setMessageTerm] = createSignal('')
  const [container, setContainer] = createSignal<HTMLDivElement>()

  const handleSubmit = () => {
    data()?.push(
      boxed({
        sender: username(),
        content: messageTerm(),
        timestamp: Date.now(),
      } satisfies chats.Message),
    )
    setMessageTerm('')
  }

  createEffect(
    on(data, () => {
      const div = container()
      if (div) {
        // NOTES: Xinyu: This looks strange but let's keep it.
        div.scrollTop = div.scrollHeight
      }
    }),
  )

  return (
    <div class={styles.App}>
      <div class={styles.App_header}>#Message the Group</div>
      <div class={styles.App__messages} ref={setContainer}>
        <For each={data()}>
          {(msg) => (
            <div class={msg.value.sender == username() ? styles.App__messageForeign : styles.App__messageLocal}>
              <div class={styles.App__message}>
                <img
                  src={
                    msg.value.sender == username()
                      ? 'https://picsum.photos/200/300?random=1'
                      : 'https://cdn.drawception.com/images/avatars/647493-B9E.png'
                  }
                />
                <div class={styles.App__msgContent}>
                  <h4>
                    {' '}
                    {msg.value.sender}
                    <span>{new Date(msg.value.timestamp).toDateString()}</span>
                  </h4>
                  <p> {msg.value.content} </p>
                </div>
              </div>
            </div>
          )}
        </For>
      </div>
      <div class={styles.App__input}>
        <textarea
          name="message"
          placeholder="Message the group"
          onChange={(event) => setMessageTerm(event.target.value)}
          value={messageTerm()}
        />
        <button class={styles.App__button} onClick={handleSubmit}>
          Send
        </button>
      </div>
    </div>
  )
}
