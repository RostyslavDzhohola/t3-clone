"use client";

import { useState, useEffect } from "react";
import { type Message } from "@ai-sdk/react";

export interface LocalStorageChat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

export const ANONYMOUS_MESSAGE_LIMIT = 10;
const ANONYMOUS_STORAGE_KEY = "anonymous_message_count";
const ANONYMOUS_AI_COUNT_KEY = "anonymous_ai_message_count";
const ANONYMOUS_CHATS_KEY = "anonymous_chats";
const ANONYMOUS_CURRENT_CHAT_KEY = "anonymous_current_chat";

export function useAnonymousChat(user: { id: string } | null | undefined) {
  const [previousUserId, setPreviousUserId] = useState<string | null>(user?.id ?? null);
  const [anonymousMessageCount, setAnonymousMessageCount] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(ANONYMOUS_STORAGE_KEY);
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });

  const [anonymousAiMessageCount, setAnonymousAiMessageCount] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(ANONYMOUS_AI_COUNT_KEY);
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });

  const [bannerClosed, setBannerClosed] = useState(false);
  const [anonymousChats, setAnonymousChats] = useState<LocalStorageChat[]>([]);
  const [currentAnonymousChat, setCurrentAnonymousChat] = useState<LocalStorageChat | null>(null);
  const [isAnonymousLimitReached, setIsAnonymousLimitReached] = useState(false);

  const clearAnonymousData = () => {
    localStorage.removeItem(ANONYMOUS_STORAGE_KEY);
    localStorage.removeItem(ANONYMOUS_AI_COUNT_KEY);
    localStorage.removeItem(ANONYMOUS_CHATS_KEY);
    localStorage.removeItem(ANONYMOUS_CURRENT_CHAT_KEY);
    setAnonymousMessageCount(0);
    setAnonymousAiMessageCount(0);
    setBannerClosed(false);
    setAnonymousChats([]);
    setCurrentAnonymousChat(null);
    setIsAnonymousLimitReached(false);
  };

  useEffect(() => {
    if (previousUserId && !user) {
      clearAnonymousData();
    }
    setPreviousUserId(user?.id ?? null);
  }, [user, previousUserId]);

  useEffect(() => {
    if (!user) {
      const savedCount = localStorage.getItem(ANONYMOUS_STORAGE_KEY);
      const count = savedCount ? parseInt(savedCount, 10) : 0;
      setAnonymousMessageCount(count);

      const savedAiCount = localStorage.getItem(ANONYMOUS_AI_COUNT_KEY);
      const aiCount = savedAiCount ? parseInt(savedAiCount, 10) : 0;
      if (aiCount !== anonymousAiMessageCount) {
        setAnonymousAiMessageCount(aiCount);
      }
      setIsAnonymousLimitReached(aiCount >= ANONYMOUS_MESSAGE_LIMIT);

      const savedChats = localStorage.getItem(ANONYMOUS_CHATS_KEY);
      const chats = savedChats ? JSON.parse(savedChats) : [];
      setAnonymousChats(chats);

      const savedCurrentChatId = localStorage.getItem(ANONYMOUS_CURRENT_CHAT_KEY);
      if (savedCurrentChatId && chats.length > 0) {
        const currentChat = chats.find((c: LocalStorageChat) => c.id === savedCurrentChatId);
        if (currentChat) {
          setCurrentAnonymousChat(currentChat);
        }
      }
    }
  }, [user, anonymousAiMessageCount]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem(ANONYMOUS_STORAGE_KEY, anonymousMessageCount.toString());
    }
  }, [anonymousMessageCount, user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem(ANONYMOUS_AI_COUNT_KEY, anonymousAiMessageCount.toString());
      setIsAnonymousLimitReached(anonymousAiMessageCount >= ANONYMOUS_MESSAGE_LIMIT);
    }
  }, [anonymousAiMessageCount, user]);

  const saveUserMessageToLocalStorage = (userMessage: Message, chatToUpdate: LocalStorageChat) => {
    try {
      const updatedMessages = [...chatToUpdate.messages, userMessage];
      const updatedChat = { ...chatToUpdate, messages: updatedMessages };

      if (chatToUpdate.messages.length === 0) {
        const title = userMessage.content.slice(0, 30) + (userMessage.content.length > 30 ? "..." : "");
        updatedChat.title = title;
      }

      setCurrentAnonymousChat(updatedChat);
      const currentChatsFromStorage = localStorage.getItem(ANONYMOUS_CHATS_KEY);
      const currentChats: LocalStorageChat[] = currentChatsFromStorage ? JSON.parse(currentChatsFromStorage) : [];
      const updatedChats = currentChats.map((chat) => (chat.id === chatToUpdate.id ? updatedChat : chat));
      const chatExists = currentChats.some((chat) => chat.id === chatToUpdate.id);
      if (!chatExists) {
        updatedChats.unshift(updatedChat);
      }
      localStorage.setItem(ANONYMOUS_CHATS_KEY, JSON.stringify(updatedChats));
      setAnonymousChats(updatedChats);
      return updatedChat;
    } catch (error) {
      console.error("Failed to save user message", error);
      return chatToUpdate;
    }
  };

  const createAnonymousChat = () => {
    const newChatId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newChat: LocalStorageChat = {
      id: newChatId,
      title: "New Chat",
      messages: [],
      createdAt: Date.now(),
    };
    const updatedChats = [newChat, ...anonymousChats];
    setAnonymousChats(updatedChats);
    setCurrentAnonymousChat(newChat);
    localStorage.setItem(ANONYMOUS_CHATS_KEY, JSON.stringify(updatedChats));
    localStorage.setItem(ANONYMOUS_CURRENT_CHAT_KEY, newChatId);
    return newChatId;
  };

  return {
    anonymousMessageCount,
    anonymousAiMessageCount,
    setAnonymousAiMessageCount,
    bannerClosed,
    setBannerClosed,
    anonymousChats,
    setAnonymousChats,
    currentAnonymousChat,
    setCurrentAnonymousChat,
    isAnonymousLimitReached,
    clearAnonymousData,
    saveUserMessageToLocalStorage,
    createAnonymousChat,
  };
}

