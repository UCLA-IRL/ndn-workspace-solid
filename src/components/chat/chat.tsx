import { createEffect, createSignal, For, on } from 'solid-js'
import styles from './App.module.css'
import { useNdnWorkspace } from '../../Context'
import { Message } from './message/message'
import * as Y from 'yjs'
import { getYjsDoc } from '@syncedstore/core'

export function Chat() {
  const { rootDoc, syncAgent } = useNdnWorkspace()!
  const [yDoc, setyDoc] = createSignal<Y.Doc>()
  setyDoc(getYjsDoc(rootDoc()))
  const [data, setData] = createSignal<{ message: Message }[]>([])

  // const getData = (collection: string) => {
  //   // To be implemented
  //   console.log('get data at: ', collection)
  //   const chats = yDoc()!.getArray('chats')

  //   console.log(chats)
  //   // chats.toArray().map((message: any) => console.log("Debug", message, JSON.parse(message)));
  //   setData(chats.toArray().map((message: unknown) => JSON.parse(message as string)))
  //   // setData(prevData => [...prevData, {sender: "node-1", content: "test", timestamp: new Date()}]);
  //   //   print everything in data
  //   //   data().forEach((message) => {
  //   //     console.log("content: ", message, "content", message.message.content);
  //   // });
  // }

  const username = () => {
    const nodeId = syncAgent()?.nodeId
    if (nodeId) {
      return nodeId.at(nodeId.length - 1).text
    } else {
      return ''
    }
  }

  const [messageTerm, setMessageTerm] = createSignal('')
  let submit_input: any //eslint-disable-line
  let container: any //eslint-disable-line

  const addData = (collection: string, data: { message: Message }) => {
    if (yDoc() === undefined) {
      setyDoc(getYjsDoc(rootDoc()))
    }
    const chats = yDoc()!.getArray('chats')
    const jsonData = JSON.stringify(data)
    // console.log('add data: ' + jsonData)
    chats.push([jsonData])
    //refresh data
    // setData(chats.toArray().map((message: unknown) => JSON.parse(message as string)))
    // console.log(data)
  }

  const handleSubmit = () => {
    const myMessage: Message = {
      sender: username(),
      content: messageTerm(),
      timestamp: new Date(),
    }
    addData('chats', {
      message: myMessage,
    })
    submit_input.value = ''
  }

  createEffect(
    on(data, () => {
      container.scrollTop = container.scrollHeight
    }),
  )

  // query yDoc every second to obtain the updates
  createEffect(() => {
    setInterval(() => {
      const chats = yDoc()!.getArray('chats')
      //refresh data
      setData(chats.toArray().map((message: any) => JSON.parse(message))) //eslint-disable-line
    }, 1000)
  })

  return (
    <div class={styles.App}>
      <h1>Message the Group</h1>
      <div class={styles.App__messages} ref={container}>
        <For each={data()}>
          {(msg) => (
            // console.log("at render()", msg.message.content, username()),
            <div class={msg.message.sender == username() ? styles.App__messageLocal : styles.App__messageForeign}>
              {msg.message.content}
            </div>
          )}
        </For>
      </div>
      <div class={styles.App__input}>
        <textarea
          placeholder="Message the group"
          onKeyUp={(e) => setMessageTerm(e.currentTarget.value)}
          ref={submit_input}
        />
        <button class={styles.App__button} onClick={handleSubmit}>
          Send
        </button>
      </div>
    </div>
  )
}
