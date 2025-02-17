import {batch, createEffect, createMemo, createSignal, For, on} from 'solid-js'
import { boxed } from '@syncedstore/core'
import { useNdnWorkspace } from '../../Context'
import { chats } from '../../backend/models'
import { createSyncedStoreSig } from '../../adaptors/solid-synced-store'
import { useChatState } from "./chat-state-store.tsx";
import { AddChannelDialog } from "./add-channel-dialog.tsx";
import { ToggleChannelVisibilityDialog } from "./toggle-visibility-dialog.tsx";
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
  const { chatState: hiddenChannels, updateChatState: setHiddenChannels } = useChatState<string[]>(`${syncAgent()?.nodeId}/hiddenChannels`, [])

  const [messageTerm, setMessageTerm] = createSignal('')
  const [container, setContainer] = createSignal<HTMLDivElement>()
  const [currentChannel, setCurrentChannel] = createSignal('general')
  const [isAddChannelDialogOpen, setIsAddChannelDialogOpen] = createSignal(false)
  const [isToggleVisibilityDialogOpen, setIsToggleVisibilityDialogOpen] = createSignal(false)
  const [persistedChannels, setPersistedChannels] = createSignal<string[]>(['general'])

  const channels = createMemo<string[]>((): string[] => {
    const messageData = data();
    if (!messageData) {
      return Array.from(new Set(persistedChannels()).difference(new Set(hiddenChannels())))
    }

    const uniqueChannels: Set<string> = new Set();
    messageData.forEach(msg => {
      if (msg.value.channel) {
        uniqueChannels.add(msg.value.channel);
      }
    });

    const finalChannels: Set<string> = uniqueChannels
      .union(new Set(persistedChannels()))
      .difference(new Set(hiddenChannels()))

    return Array.from(finalChannels).sort();
  });

  const filteredMessages = createMemo(() =>
    data()?.filter((msg) => msg.value.channel === currentChannel())
  );

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

  createEffect(
    on(channels, () => {
      if (!channels().includes(currentChannel())) {
        setCurrentChannel(channels()[0])
      }
    }),
  )

  const addChannel = (channelName: string) => {
    const trimmedName = channelName.trim()
    if (trimmedName && !channels().includes(trimmedName) && !hiddenChannels().includes(trimmedName)) {
      setPersistedChannels([...persistedChannels(), trimmedName])
      setCurrentChannel(trimmedName)
    }
    else {
      alert('Channel name cannot be empty or already exist')
    }
  }

  const hideChannel = (channelName: string) => {
    if (channels().length === 1) {
      alert('Cannot hide the last channel')
      return
    }

    setHiddenChannels([...new Set([...hiddenChannels(), channelName])])
  }

  const isLocalUser = (sender: string) => sender == username()

  const userPfpId = (sender: string) => {
    let hash = 0;
    for (let i = 0; i < sender.length; i++) {
      hash = (hash * 31 + sender.charCodeAt(i)) >>> 0;  // Ensure the hash is always a 32-bit unsigned integer
    }
    return hash % 1024;
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
                <span
                  title={"Hide channel"}
                  class={styles.HideChannelButton}
                  aria-label={"Hide channel"}
                  onClick={(event) => {
                    event.stopPropagation()
                    hideChannel(channel)
                  }
                }>x</span>
              </button>
            )}
          </For>
          <button
            class={styles.AddChannelButton}
            onClick={() => setIsAddChannelDialogOpen(true)}
            title={"New channel"}
            aria-label={"New channel"}>
            +
          </button>
          <button
            class={styles.AddChannelButton}
            onClick={() => setIsToggleVisibilityDialogOpen(true)}
            title={"Unhide channels"}
            aria-label={"Un-hide channels"}>
            &#x2630;
          </button>
        </div>
        <h2 class={styles.ChannelHeading}>#{currentChannel()} Channel</h2>
      </div>
      <div class={styles.App__messages} ref={setContainer}>
        <For each={filteredMessages()}>
          {(msg) => (
            <div>
              <div class={styles.App__message}>
                <img
                  aria-hidden={true}
                  alt={`${msg.value.sender}'s profile picture`}
                  src={`https://picsum.photos/id/${userPfpId(msg.value.sender)}/128/128`}
                  style="flex-shrink: 0"
                />
                <div class={styles.App__msgContent}>
                  <h4
                    class={`${styles.App__msgHeader} 
                      ${isLocalUser(msg.value.sender) ? styles.App__backgroundLocal : styles.App__backgroundForeign} 
                      ${isLocalUser(msg.value.sender) ? styles.App__borderLocal : styles.App__borderForeign}`}
                  >
                    {' '}
                    {msg.value.sender}
                    {' '}
                    <span>{new Date(msg.value.timestamp).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}</span>
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
          placeholder={`Message the #${currentChannel()} channel`}
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

      <ToggleChannelVisibilityDialog
        open={isToggleVisibilityDialogOpen()}
        channels={channels}
        hiddenChannels={hiddenChannels}
        setHiddenChannels={setHiddenChannels}
        onClose={() => setIsToggleVisibilityDialogOpen(false)}
      />
    </div>
  )
}
