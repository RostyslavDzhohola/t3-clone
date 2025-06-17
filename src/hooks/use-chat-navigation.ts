import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Id } from "../../convex/_generated/dataModel";
import { type Message } from "@ai-sdk/react";
import { LocalStorageChat, ANONYMOUS_STORAGE_KEYS } from "@/lib/constants";

interface Chat {
  _id: Id<"chats">;
  title: string;
}

interface UseChatNavigationProps {
  user: { id: string } | null | undefined;
  chats: Chat[] | undefined;
  anonymousChats: LocalStorageChat[];
  setMessages: (messages: Message[]) => void;
  setCurrentAnonymousChat: (chat: LocalStorageChat | null) => void;
}

interface UseChatNavigationReturn {
  currentChatId: Id<"chats"> | string | null;
  setCurrentChatId: (chatId: Id<"chats"> | string | null) => void;
  handleChatSelect: (chatId: Id<"chats"> | string) => void;
  autoSelectFirstChat: () => void;
  syncChatFromUrl: () => void;
}

export function useChatNavigation({
  user,
  chats,
  anonymousChats,
  setMessages,
  setCurrentAnonymousChat,
}: UseChatNavigationProps): UseChatNavigationReturn {
  const router = useRouter();
  const pathname = usePathname();
  const [currentChatId, setCurrentChatId] = useState<
    Id<"chats"> | string | null
  >(null);

  // Switch to a different chat
  const handleChatSelect = (chatId: Id<"chats"> | string) => {
    console.log("🔄 Switching to chat:", chatId);

    if (user && typeof chatId === "string" && chatId.length > 10) {
      // Authenticated user with Convex chat
      setCurrentChatId(chatId as Id<"chats">);
      router.push(`/chat/${chatId}`);
    } else if (!user && typeof chatId === "string") {
      // Anonymous user with localStorage chat
      const chat = anonymousChats.find((c) => c.id === chatId);
      if (chat) {
        setCurrentAnonymousChat(chat);
        setCurrentChatId(chatId);
        localStorage.setItem(ANONYMOUS_STORAGE_KEYS.CURRENT_CHAT, chatId);
      }
    }
  };

  // Auto-select first chat if none selected and we're on the home page
  const autoSelectFirstChat = useCallback(() => {
    if (pathname === "/" && !currentChatId) {
      if (user && chats && chats.length > 0) {
        const firstChat = chats[0];
        console.log("🏠 Auto-selecting first chat:", firstChat._id);
        setCurrentChatId(firstChat._id);
        router.push(`/chat/${firstChat._id}`);
      } else if (!user && anonymousChats.length > 0) {
        const firstChat = anonymousChats[0];
        console.log("🏠 Auto-selecting first anonymous chat:", firstChat.id);
        setCurrentAnonymousChat(firstChat);
        setCurrentChatId(firstChat.id);
        localStorage.setItem(ANONYMOUS_STORAGE_KEYS.CURRENT_CHAT, firstChat.id);
      }
    }
  }, [
    pathname,
    currentChatId,
    user,
    chats,
    anonymousChats,
    router,
    setCurrentAnonymousChat,
  ]);

  // Extract chat ID from URL if we're on a chat page (only for authenticated users)
  const syncChatFromUrl = useCallback(() => {
    if (user && pathname.startsWith("/chat/")) {
      const chatIdFromUrl = pathname.split("/chat/")[1];
      if (chatIdFromUrl && chatIdFromUrl !== currentChatId) {
        console.log("🔗 Setting chat ID from URL:", chatIdFromUrl);
        setCurrentChatId(chatIdFromUrl as Id<"chats">);
      }
    }
  }, [user, pathname, currentChatId]);

  // Auto-select first chat effect
  useEffect(() => {
    autoSelectFirstChat();
  }, [
    user,
    chats,
    anonymousChats,
    currentChatId,
    pathname,
    autoSelectFirstChat,
  ]);

  // URL synchronization effect
  useEffect(() => {
    syncChatFromUrl();
  }, [user, pathname, currentChatId, syncChatFromUrl]);

  // Clear messages when no chat is selected
  useEffect(() => {
    if (!currentChatId) {
      setMessages([]);
    }
  }, [currentChatId, setMessages]);

  return {
    currentChatId,
    setCurrentChatId,
    handleChatSelect,
    autoSelectFirstChat,
    syncChatFromUrl,
  };
}
