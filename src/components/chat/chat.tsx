import { createEffect, createSignal, For, on } from 'solid-js'
import styles from './App.module.css'
import { useNdnWorkspace } from '../../Context'
import { Message } from './message/message'

export function Chat() {
  const { rootDoc, syncAgent } = useNdnWorkspace()!
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
    const chats = rootDoc()?.chats
    if (chats) {
      chats.push(data.message) // Push the Message object directly
    }
    //refresh data
    // setData(chats.toArray().map((message: unknown) => JSON.parse(message as string)))
    // console.log(data)
  }

  const handleSubmit = () => {
    //do shit for when the timestamp is same append the message content instead of adding it?
    const myMessage: Message = {
      sender: username(),
      content: messageTerm(),
      timestamp: Date.now(),
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
      const chats = rootDoc()?.chats
      if (chats) {
        setData(chats.map((message: Message) => ({ message })))
        //refresh data
      }
    }, 1000)
  })

  return (
    <div class={styles.App}>
      <div class={styles.App_header}>#Message the Group</div>
      <div class={styles.App__messages} ref={container}>
        <For each={data()}>
          {(msg) => (
            // console.log("at render()", msg.message.content, username()),
            <div class={msg.message.sender == username() ? styles.App__messageForeign : styles.App__messageLocal}>
              <div class={styles.App__message}>
                <img
                  src={
                    msg.message.sender == username()
                      ? 'https://picsum.photos/200/300?random=1'
                      : 'https://cdn.drawception.com/images/avatars/647493-B9E.png'
                  }
                />
                <div class={styles.App__msgContent}>
                  <h4>
                    {' '}
                    {msg.message.sender}
                    <span>{new Date(msg.message.timestamp).toDateString()}</span>
                  </h4>
                  <p> {msg.message.content} </p>
                </div>
              </div>
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
