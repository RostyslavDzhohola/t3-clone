import { useState, useEffect } from "react";
import { type Message } from "@ai-sdk/react";

interface LocalStorageChat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

const ANONYMOUS_MESSAGE_LIMIT = 10;
const ANONYMOUS_STORAGE_KEY = "anonymous_message_count";
const ANONYMOUS_CHATS_KEY = "anonymous_chats";
const ANONYMOUS_CURRENT_CHAT_KEY = "anonymous_current_chat";

export function useAnonymousChat() {
  const [anonymousMessageCount, setAnonymousMessageCount] = useState(0);
  const [anonymousChats, setAnonymousChats] = useState<LocalStorageChat[]>([]);
  const [currentAnonymousChat, setCurrentAnonymousChat] =
    useState<LocalStorageChat | null>(null);
  const [isAnonymousLimitReached, setIsAnonymousLimitReached] = useState(false);

  // Load anonymous data from localStorage
  useEffect(() => {
    const savedCount = localStorage.getItem(ANONYMOUS_STORAGE_KEY);
    const count = savedCount ? parseInt(savedCount, 10) : 0;
    setAnonymousMessageCount(count);
    setIsAnonymousLimitReached(count >= ANONYMOUS_MESSAGE_LIMIT);

    const savedChats = localStorage.getItem(ANONYMOUS_CHATS_KEY);
    const chats = savedChats ? JSON.parse(savedChats) : [];
    setAnonymousChats(chats);

    const savedCurrentChatId = localStorage.getItem(ANONYMOUS_CURRENT_CHAT_KEY);
    if (savedCurrentChatId && chats.length > 0) {
      const currentChat = chats.find(
        (chat: LocalStorageChat) => chat.id === savedCurrentChatId
      );
      if (currentChat) {
        setCurrentAnonymousChat(currentChat);
      }
    }
  }, []);

  // Save anonymous message count to localStorage
  useEffect(() => {
    localStorage.setItem(
      ANONYMOUS_STORAGE_KEY,
      anonymousMessageCount.toString()
    );
    setIsAnonymousLimitReached(
      anonymousMessageCount >= ANONYMOUS_MESSAGE_LIMIT
    );
  }, [anonymousMessageCount]);

  const clearAnonymousData = () => {
    console.log("🧹 Clearing anonymous data from localStorage");
    localStorage.removeItem(ANONYMOUS_STORAGE_KEY);
    localStorage.removeItem(ANONYMOUS_CHATS_KEY);
    localStorage.removeItem(ANONYMOUS_CURRENT_CHAT_KEY);
    setAnonymousMessageCount(0);
    setAnonymousChats([]);
    setCurrentAnonymousChat(null);
    setIsAnonymousLimitReached(false);
  };

  const createAnonymousChat = (): string => {
    const newChatId = `anon_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const newChat: LocalStorageChat = {
      id: newChatId,
      title: "New Chat",
      messages: [],
      createdAt: Date.now(),
    };

    const updatedChats = [newChat, ...anonymousChats];
    setAnonymousChats(updatedChats);
    setCurrentAnonymousChat(newChat);

    // Save to localStorage
    localStorage.setItem(ANONYMOUS_CHATS_KEY, JSON.stringify(updatedChats));
    localStorage.setItem(ANONYMOUS_CURRENT_CHAT_KEY, newChatId);

    console.log("✅ Anonymous chat created with ID:", newChatId);
    return newChatId;
  };

  const selectAnonymousChat = (chatId: string) => {
    const chat = anonymousChats.find((c) => c.id === chatId);
    if (chat) {
      setCurrentAnonymousChat(chat);
      localStorage.setItem(ANONYMOUS_CURRENT_CHAT_KEY, chatId);
      return chat;
    }
    return null;
  };

  const updateAnonymousChat = (
    chatId: string,
    updates: Partial<LocalStorageChat>
  ) => {
    const updatedChats = anonymousChats.map((chat) =>
      chat.id === chatId ? { ...chat, ...updates } : chat
    );
    setAnonymousChats(updatedChats);
    localStorage.setItem(ANONYMOUS_CHATS_KEY, JSON.stringify(updatedChats));

    if (currentAnonymousChat?.id === chatId) {
      setCurrentAnonymousChat({ ...currentAnonymousChat, ...updates });
    }
  };

  const incrementMessageCount = () => {
    setAnonymousMessageCount((count) => count + 1);
  };

  return {
    anonymousMessageCount,
    anonymousChats,
    currentAnonymousChat,
    isAnonymousLimitReached,
    clearAnonymousData,
    createAnonymousChat,
    selectAnonymousChat,
    updateAnonymousChat,
    incrementMessageCount,
    setCurrentAnonymousChat,
    ANONYMOUS_MESSAGE_LIMIT,
  };
}

export type { LocalStorageChat };
