import { createSignal } from "solid-js";

export function useChatState<T>(keyName: string, defaultValue: T) {
  const [chatState, setChatState] = createSignal<T>(
    JSON.parse(localStorage.getItem(keyName) || JSON.stringify(defaultValue))
  );

  const updateChatState = (newValue: T) => {
    setChatState(() => newValue);
    localStorage.setItem(keyName, JSON.stringify(newValue));
  };

  return { chatState, updateChatState };
}
