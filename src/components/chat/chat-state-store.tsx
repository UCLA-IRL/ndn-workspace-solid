import Cookies from "js-cookie";
import { createSignal } from "solid-js";

export function useChatState<T>(cookieName: string, defaultValue: T) {
  const [chatState, setChatState] = createSignal<T>(
    JSON.parse(Cookies.get(cookieName) || JSON.stringify(defaultValue))
  );

  const updateChatState = (newValue: T) => {
    setChatState(() => newValue);
    Cookies.set(cookieName, JSON.stringify(newValue), { expires: 365 });
  };

  return { chatState, updateChatState };
}
