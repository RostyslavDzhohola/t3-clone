import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import type { Message } from "@ai-sdk/react";
import {
  LocalStorageChat,
  ANONYMOUS_MESSAGE_LIMIT,
  ANONYMOUS_STORAGE_KEYS,
} from "@/lib/constants";
import {
  generateAnonymousChatId,
  isAnonymousLimitReached as checkAnonymousLimitReached,
  getNumberFromStorage,
  setNumberInStorage,
  getObjectFromStorage,
  setObjectInStorage,
  clearAnonymousData,
} from "@/lib/chatHelpers";

export function useChatManagement(currentChatId?: string) {
  const { user } = useUser();
  const router = useRouter();

  // Convex operations for authenticated users
  const chats = useQuery(
    api.messages.getChats,
    user ? { userId: user.id } : "skip"
  );
  const createChat = useMutation(api.messages.createChat);
  const deleteChat = useMutation(api.messages.deleteChat);

  // State management
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [previousUserId, setPreviousUserId] = useState<string | null>(null);

  // Anonymous user state
  const [anonymousMessageCount, setAnonymousMessageCount] = useState(() => {
    return getNumberFromStorage(ANONYMOUS_STORAGE_KEYS.MESSAGE_COUNT, 0);
  });

  const [anonymousAiMessageCount, setAnonymousAiMessageCount] = useState(() => {
    return getNumberFromStorage(ANONYMOUS_STORAGE_KEYS.AI_COUNT, 0);
  });

  const [anonymousChats, setAnonymousChats] = useState<LocalStorageChat[]>([]);
  const [currentAnonymousChat, setCurrentAnonymousChat] =
    useState<LocalStorageChat | null>(null);
  const [isAnonymousLimitReached, setIsAnonymousLimitReached] = useState(false);

  // Helper function to clear anonymous data
  const handleClearAnonymousData = useCallback(() => {
    console.log("🧹 Clearing anonymous data from localStorage");
    clearAnonymousData();
    setAnonymousMessageCount(0);
    setAnonymousAiMessageCount(0);
    setAnonymousChats([]);
    setCurrentAnonymousChat(null);
    setIsAnonymousLimitReached(false);
  }, []);

  // Watch for user sign out to reset anonymous data
  useEffect(() => {
    if (previousUserId && !user) {
      console.log("👋 User signed out, clearing anonymous data");
      handleClearAnonymousData();
    }
    setPreviousUserId(user?.id || null);
  }, [user, previousUserId, handleClearAnonymousData]);

  // Load anonymous data from localStorage
  useEffect(() => {
    if (!user) {
      const count = getNumberFromStorage(
        ANONYMOUS_STORAGE_KEYS.MESSAGE_COUNT,
        0
      );
      setAnonymousMessageCount(count);

      const aiCount = getNumberFromStorage(ANONYMOUS_STORAGE_KEYS.AI_COUNT, 0);
      if (aiCount !== anonymousAiMessageCount) {
        setAnonymousAiMessageCount(aiCount);
      }

      setIsAnonymousLimitReached(
        checkAnonymousLimitReached(aiCount, ANONYMOUS_MESSAGE_LIMIT)
      );

      const chats = getObjectFromStorage<LocalStorageChat[]>(
        ANONYMOUS_STORAGE_KEYS.CHATS,
        []
      );
      setAnonymousChats(chats);

      const savedCurrentChatId = localStorage.getItem(
        ANONYMOUS_STORAGE_KEYS.CURRENT_CHAT
      );
      if (savedCurrentChatId && chats.length > 0) {
        const currentChat = chats.find(
          (chat: LocalStorageChat) => chat.id === savedCurrentChatId
        );
        if (currentChat) {
          setCurrentAnonymousChat(currentChat);
        }
      }
    }
  }, [user, anonymousAiMessageCount]);

  // Save anonymous counts to localStorage
  useEffect(() => {
    if (!user) {
      setNumberInStorage(
        ANONYMOUS_STORAGE_KEYS.MESSAGE_COUNT,
        anonymousMessageCount
      );
    }
  }, [anonymousMessageCount, user]);

  useEffect(() => {
    if (!user) {
      setNumberInStorage(
        ANONYMOUS_STORAGE_KEYS.AI_COUNT,
        anonymousAiMessageCount
      );
    }
  }, [anonymousAiMessageCount, user]);

  // Anonymous chat operations
  const updateAnonymousChat = useCallback((updatedChat: LocalStorageChat) => {
    const chats = getObjectFromStorage<LocalStorageChat[]>(
      ANONYMOUS_STORAGE_KEYS.CHATS,
      []
    );
    const updatedChats = chats.map((chat) =>
      chat.id === updatedChat.id ? updatedChat : chat
    );

    setObjectInStorage(ANONYMOUS_STORAGE_KEYS.CHATS, updatedChats);
    setAnonymousChats(updatedChats);
    setCurrentAnonymousChat(updatedChat);
  }, []);

  const addMessageToAnonymousChat = useCallback(
    (message: Message, chatId: string) => {
      const chats = getObjectFromStorage<LocalStorageChat[]>(
        ANONYMOUS_STORAGE_KEYS.CHATS,
        []
      );
      const targetChat = chats.find((chat) => chat.id === chatId);

      if (targetChat) {
        const updatedChat = {
          ...targetChat,
          messages: [...targetChat.messages, message],
        };
        updateAnonymousChat(updatedChat);
      }
    },
    [updateAnonymousChat]
  );

  const loadAnonymousChat = useCallback(
    (chatId: string): LocalStorageChat | null => {
      const chats = getObjectFromStorage<LocalStorageChat[]>(
        ANONYMOUS_STORAGE_KEYS.CHATS,
        []
      );
      const chat = chats.find((chat) => chat.id === chatId);

      if (chat) {
        setCurrentAnonymousChat(chat);
        localStorage.setItem(ANONYMOUS_STORAGE_KEYS.CURRENT_CHAT, chatId);
      }

      return chat || null;
    },
    []
  );

  // Create new chat
  const createNewChat = useCallback(async () => {
    if (!user) {
      // Anonymous user - create in localStorage
      const newChatId = generateAnonymousChatId();
      const newChat: LocalStorageChat = {
        id: newChatId,
        title: "New Chat",
        messages: [],
        createdAt: Date.now(),
      };

      const updatedChats = [newChat, ...anonymousChats];
      setAnonymousChats(updatedChats);
      setObjectInStorage(ANONYMOUS_STORAGE_KEYS.CHATS, updatedChats);
      localStorage.setItem(ANONYMOUS_STORAGE_KEYS.CURRENT_CHAT, newChatId);
      setCurrentAnonymousChat(newChat);

      return newChatId;
    } else {
      // Authenticated user - create in Convex
      const chatId = await createChat({
        userId: user.id,
        title: "New Chat",
      });
      return chatId;
    }
  }, [user, anonymousChats, createChat]);

  // Handle new chat creation with navigation
  const handleNewChat = useCallback(async () => {
    if (isCreatingChat) return;
    setIsCreatingChat(true);

    try {
      const chatId = await createNewChat();
      router.push(`/chat/${chatId}`);
    } catch (error) {
      console.error("Failed to create chat:", error);
      toast.error("Failed to create new chat");
    } finally {
      setIsCreatingChat(false);
    }
  }, [isCreatingChat, createNewChat, router]);

  // Handle delete chat
  const handleDeleteChat = useCallback(
    async (chatId: Id<"chats"> | string) => {
      try {
        if (user) {
          // Authenticated user - delete from Convex
          await deleteChat({
            chatId: chatId as Id<"chats">,
            userId: user.id,
          });

          // Navigate away if we're deleting current chat
          if (currentChatId === chatId) {
            router.push("/");
          }
        } else {
          // Anonymous user - delete from localStorage
          const updatedChats = anonymousChats.filter(
            (chat) => chat.id !== chatId
          );
          setAnonymousChats(updatedChats);
          setObjectInStorage(ANONYMOUS_STORAGE_KEYS.CHATS, updatedChats);

          // Navigate away if we're deleting current chat
          if (currentChatId === chatId) {
            localStorage.removeItem(ANONYMOUS_STORAGE_KEYS.CURRENT_CHAT);
            router.push("/");
          }
        }

        toast.success("Chat deleted successfully");
      } catch (error) {
        console.error("Failed to delete chat:", error);
        toast.error("Failed to delete chat");
      }
    },
    [user, anonymousChats, currentChatId, deleteChat, router]
  );

  // Prepare unified chat list
  const allChats = user
    ? chats?.map((chat) => ({ _id: chat._id, title: chat.title })) || []
    : anonymousChats.map((chat) => ({ _id: chat.id, title: chat.title }));

  return {
    // State
    isCreatingChat,
    anonymousMessageCount,
    anonymousAiMessageCount,
    isAnonymousLimitReached,
    currentAnonymousChat,
    anonymousChats,
    allChats,

    // Constants
    ANONYMOUS_MESSAGE_LIMIT,

    // Actions
    handleNewChat,
    handleDeleteChat,
    createNewChat,
    handleClearAnonymousData,

    // Anonymous operations
    updateAnonymousChat,
    addMessageToAnonymousChat,
    loadAnonymousChat,

    // Anonymous state setters (for external components)
    setAnonymousAiMessageCount,
    setAnonymousChats,
    setCurrentAnonymousChat,
  };
}
