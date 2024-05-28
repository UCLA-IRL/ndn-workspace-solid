import { createEffect, createSignal, For, on } from 'solid-js'
import { boxed } from '@syncedstore/core'
import { useNdnWorkspace } from '../../Context'
import { chats } from '../../backend/models'
import { createSyncedStoreSig } from '../../adaptors/solid-synced-store'
import styles from './styles.module.scss'
import { useNavigate } from '@solidjs/router'

// TODO: Do not load all messages at once
// TODO: Support Markdown
// TODO: Users should be able to add their own channels (currently hard-coded)

export function Chat() {
  const { rootDoc, syncAgent, booted } = useNdnWorkspace()!
  const navigate = useNavigate()
  const messages = createSyncedStoreSig(() => rootDoc()?.chats)
  const data = () => messages()?.value
  const username = () => syncAgent()?.nodeId.at(-1).text ?? ''

  const [messageTerm, setMessageTerm] = createSignal('')
  const [container, setContainer] = createSignal<HTMLDivElement>()
  const [currentChannel, setCurrentChannel] = createSignal('general')
  const channels = ['general', 'paper_writing', 'code_discussion', 'help'] // Define your channels here

  if (!booted()) {
    navigate('/profile', { replace: true })
  }

  const handleSubmit = () => {
    data()?.push(
      boxed({
        sender: username(),
        content: messageTerm(),
        timestamp: Date.now(),
        channel: currentChannel(),
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

  const filteredMessages = () => data()?.filter(msg => msg.value.channel === currentChannel())

  return (
    <div class={styles.App}>
      <div class={styles.App_header}>
      <div>
        <For each={channels}>
          {(channel) => (
            <button 
            class={currentChannel() === channel ? styles.ActiveChannelButton : styles.ChannelButton} 
            onClick={() => setCurrentChannel(channel)}
          >
            {channel}
          </button>
          )}
        </For>
      </div>
      <h2 style={{ color: '#333' }}>#{currentChannel()} Channel</h2>
    </div>
      <div class={styles.App__messages} ref={setContainer}>
        <For each={filteredMessages()}>
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
          placeholder={`Message the ${currentChannel()} channel`}
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
