import { batch, createEffect, createMemo, createSignal, For, on } from 'solid-js'
import { boxed } from '@syncedstore/core'
import { useNdnWorkspace } from '../../Context'
import { chats } from '../../backend/models'
import { createSyncedStoreSig } from '../../adaptors/solid-synced-store'
import { AddChannelDialog } from './add-channel-dialog.tsx'
import styles from './styles.module.scss'
import { useNavigate } from '@solidjs/router'
import { SolidMarkdown, SolidMarkdownComponents } from 'solid-markdown'
import remarkGfm from 'remark-gfm'

// TODO: Do not load all messages at once

export function Chat() {
  const { rootDoc, syncAgent, booted } = useNdnWorkspace()!
  const navigate = useNavigate()
  const messages = createSyncedStoreSig(() => rootDoc()?.chats)
  const data = () => messages()?.value
  const username = () => syncAgent()?.nodeId.at(-1).text ?? ''

  const [messageTerm, setMessageTerm] = createSignal('')
  const [container, setContainer] = createSignal<HTMLDivElement>()
  const [currentChannel, setCurrentChannel] = createSignal('general')
  const [isAddChannelDialogOpen, setIsAddChannelDialogOpen] = createSignal(false)
  const [persistedChannels, setPersistedChannels] = createSignal<string[]>(['general'])

  const channels = createMemo(() => {
    const messageData = data()
    if (!messageData) return persistedChannels()

    const uniqueChannels = new Set(persistedChannels())
    messageData.forEach((msg) => {
      if (msg.value.channel) {
        uniqueChannels.add(msg.value.channel)
      }
    })

    return Array.from(uniqueChannels).sort()
  })

  const filteredMessages = createMemo(() => data()?.filter((msg) => msg.value.channel === currentChannel()))

  if (!booted()) {
    navigate('/profile', { replace: true })
  }

  const handleSubmit = () => {
    if (!messageTerm().trim()) return

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
    on(filteredMessages, () => {
      const div = container()
      if (div) {
        setTimeout(() => {
          div.scrollTop = div.scrollHeight
        }, 0)
      }
    }),
  )

  const addChannel = (channelName: string) => {
    const trimmedName = channelName.trim()
    if (trimmedName && !channels().includes(trimmedName)) {
      setPersistedChannels([...persistedChannels(), trimmedName])
      setCurrentChannel(trimmedName)
    } else {
      alert('Channel name cannot be empty or already exist')
    }
  }

  const isLocalUser = (sender: string) => sender == username()

  const userPfpId = (sender: string) => {
    let hash = 0
    for (let i = 0; i < sender.length; i++) {
      hash = (hash * 31 + sender.charCodeAt(i)) >>> 0 // Ensure the hash is always a 32-bit unsigned integer
    }
    return hash % 1024
  }

  /* Display */
  const Code: SolidMarkdownComponents['code'] = (props) => {
    return (
      <pre class={styles.App__messageCode}>
        <code>{props.children}</code>
      </pre>
    )
  }

  return (
    <div class={styles.App}>
      <div class={styles.App_header}>
        <div>
          <For each={channels()}>
            {(channel) => (
              <button
                class={currentChannel() === channel ? styles.ActiveChannelButton : styles.ChannelButton}
                onClick={() => setCurrentChannel(channel)}
              >
                #{channel}
              </button>
            )}
          </For>
          <button class={styles.AddChannelButton} onClick={() => setIsAddChannelDialogOpen(true)}>
            +
          </button>
        </div>
        <h2 class={styles.ChannelHeading}>#{currentChannel()} Channel</h2>
      </div>
      <div class={styles.App__messages} ref={setContainer}>
        <For each={filteredMessages()}>
          {(msg) => (
            <div>
              <div class={styles.App__message}>
                <img src={`https://picsum.photos/id/${userPfpId(msg.value.sender)}/128/128`} style="flex-shrink: 0" />
                <div class={styles.App__msgContent}>
                  <h4
                    class={`${styles.App__msgHeader} 
                      ${isLocalUser(msg.value.sender) ? styles.App__backgroundLocal : styles.App__backgroundForeign} 
                      ${isLocalUser(msg.value.sender) ? styles.App__borderLocal : styles.App__borderForeign}`}
                  >
                    {' '}
                    {msg.value.sender}{' '}
                    <span>
                      {new Date(msg.value.timestamp).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </h4>
                  <div
                    class={`${styles.App_msgContentSolid} 
                      ${isLocalUser(msg.value.sender) ? styles.App__borderLocal : styles.App__borderForeign}`}
                  >
                    <SolidMarkdown
                      children={msg.value.content}
                      remarkPlugins={[remarkGfm]}
                      components={{ code: Code }}
                    />
                  </div>
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
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              batch(() => {
                setMessageTerm((event.target as HTMLTextAreaElement).value)
                handleSubmit()
              })
            }
          }}
          value={messageTerm()}
        />
        <button class={styles.App__button} onClick={handleSubmit}>
          Send
        </button>
      </div>

      <AddChannelDialog
        open={isAddChannelDialogOpen()}
        onClose={() => setIsAddChannelDialogOpen(false)}
        onConfirm={(channelName) => {
          addChannel(channelName)
          setIsAddChannelDialogOpen(false)
        }}
      />
    </div>
  )
}
