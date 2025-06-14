"use client";

import { useState, useEffect } from "react";
import { useChat, type Message } from "@ai-sdk/react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useRouter, usePathname } from "next/navigation";
import { useMessageInput } from "../hooks";
import {
  getDefaultModel,
  getDefaultAnonymousModel,
  type LLMModel,
} from "@/lib/models";
import { toast } from "sonner";
import {
  useAnonymousChat,
  ANONYMOUS_MESSAGE_LIMIT,
  type LocalStorageChat,
} from "./useAnonymousChat";

export { ANONYMOUS_MESSAGE_LIMIT } from "./useAnonymousChat";

export function useChatUI() {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const [currentChatId, setCurrentChatId] = useState<Id<"chats"> | string | null>(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [selectedModel, setSelectedModel] = useState<LLMModel>(
    user ? getDefaultModel() : getDefaultAnonymousModel()
  );

  const {
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
    saveUserMessageToLocalStorage,
    createAnonymousChat,
  } = useAnonymousChat(user);

  useEffect(() => {
    if (user) {
      setSelectedModel(getDefaultModel());
    } else {
      setSelectedModel(getDefaultAnonymousModel());
    }
  }, [user]);

  const createChat = useMutation(api.messages.createChat);
  const saveMessage = useMutation(api.messages.saveMessage);
  const updateChatTitle = useMutation(api.messages.updateChatTitle);

  const chats = useQuery(api.messages.getChats, user ? { userId: user.id } : "skip");
  const currentChatMessages = useQuery(
    api.messages.getMessages,
    user &&
      currentChatId &&
      typeof currentChatId === "string" &&
      !currentChatId.startsWith("anon_") &&
      currentChatId.length > 10
      ? { chatId: currentChatId as Id<"chats"> }
      : "skip"
  );

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    setMessages,
    append,
    setInput,
  } = useChat({
    api: "/api/chat",
    body: {
      model: selectedModel.id,
      anonymous: !user,
      anonymousMessageCount: !user ? anonymousAiMessageCount : undefined,
    },
    onFinish: async (message: Message) => {
      if (
        user &&
        currentChatId &&
        typeof currentChatId === "string" &&
        currentChatId.length > 10
      ) {
        try {
          await saveMessage({
            chatId: currentChatId as Id<"chats">,
            userId: user.id,
            role: "assistant",
            body: message.content,
          });
        } catch (error) {
          console.error("Failed to save AI message", error);
        }
      } else if (!user) {
        setAnonymousAiMessageCount((c) => c + 1);
        setBannerClosed(false);
        setCurrentAnonymousChat((prevChat) => {
          if (!prevChat) return prevChat;
          const updatedMessages = [...prevChat.messages, message];
          const updatedChat = { ...prevChat, messages: updatedMessages };
          setAnonymousChats((prevChats) => {
            const updated = prevChats.map((chat) =>
              chat.id === prevChat.id ? updatedChat : chat
            );
            localStorage.setItem("anonymous_chats", JSON.stringify(updated));
            return updated;
          });
          return updatedChat;
        });
      }
    },
  });
  const messageInputHook = useMessageInput({
    user,
    currentChatId: user ? (currentChatId as Id<"chats">) : null,
    saveMessage,
    updateChatTitle,
    createNewChat: user ? (createNewChat as () => Promise<Id<"chats"> | null>) : async () => null,
    setCurrentChatId: user ? setCurrentChatId : () => {},
    messages,
    handleSubmit,
  });

  const {
    handleInputChangeWithAutoCreate,
    onSubmit,
    handleKeyDown: hookHandleKeyDown,
  } = user
    ? messageInputHook
    : {
        handleInputChangeWithAutoCreate: (_e: unknown, originalHandler: unknown) =>
          (originalHandler as (e: unknown) => void)(_e),
        onSubmit: () => {},
        handleKeyDown: () => {},
      };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const syntheticEvent = {
      ...e,
      target: { value: e.currentTarget.value } as HTMLInputElement,
    } as unknown as React.KeyboardEvent<HTMLInputElement>;
    hookHandleKeyDown(syntheticEvent);
  };

  const createNewChat = async () => {
    if (isCreatingChat) return null;
    setIsCreatingChat(true);

    try {
      if (user) {
        const chatId = await createChat({ userId: user.id, title: "New Chat" });
        setCurrentChatId(chatId);
        setMessages([]);
        router.push(`/chat/${chatId}`);
        return chatId;
      }
      const newChatId = createAnonymousChat();
      setCurrentChatId(newChatId);
      setMessages([]);
      return newChatId;
    } catch (error) {
      console.error("Failed to create chat", error);
      return null;
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleNewChat = async () => {
    await createNewChat();
  };

  const handleChatSelect = (chatId: Id<"chats"> | string) => {
    if (user && typeof chatId === "string" && chatId.length > 10) {
      setCurrentChatId(chatId as Id<"chats">);
      router.push(`/chat/${chatId}`);
    } else if (!user && typeof chatId === "string") {
      const chat = anonymousChats.find((c) => c.id === chatId);
      if (chat) {
        setCurrentAnonymousChat(chat);
        setCurrentChatId(chatId);
        localStorage.setItem("anonymous_current_chat", chatId);
      }
    }
  };

  useEffect(() => {
    if (user && currentChatMessages) {
      const formattedMessages: Message[] = currentChatMessages.map((msg) => ({
        id: msg._id,
        role: msg.role,
        content: msg.body,
        createdAt: new Date(msg._creationTime),
      }));
      setMessages(formattedMessages);
    } else if (!user && currentAnonymousChat) {
      setMessages(currentAnonymousChat.messages);
    } else {
      setMessages([]);
    }
  }, [user, currentChatMessages, currentAnonymousChat, setMessages]);

  useEffect(() => {
    if (pathname === "/" && !currentChatId) {
      if (user && chats && chats.length > 0) {
        const firstChat = chats[0];
        setCurrentChatId(firstChat._id);
        router.push(`/chat/${firstChat._id}`);
      } else if (!user && anonymousChats.length > 0) {
        const firstChat = anonymousChats[0];
        setCurrentAnonymousChat(firstChat);
        setCurrentChatId(firstChat.id);
        localStorage.setItem("anonymous_current_chat", firstChat.id);
      }
    }
  }, [
    user,
    chats,
    anonymousChats,
    currentChatId,
    pathname,
    router,
    setCurrentAnonymousChat,
  ]);

  useEffect(() => {
    if (user && pathname.startsWith("/chat/")) {
      const chatIdFromUrl = pathname.split("/chat/")[1];
      if (chatIdFromUrl && chatIdFromUrl !== currentChatId) {
        setCurrentChatId(chatIdFromUrl as Id<"chats">);
      }
    }
  }, [user, pathname, currentChatId]);

  const enhancedInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!user && isAnonymousLimitReached) {
      return;
    }

    if (user) {
      const syntheticEvent = {
        ...e,
        target: { value: e.target.value } as HTMLInputElement,
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleInputChangeWithAutoCreate(syntheticEvent, handleInputChange);
    } else {
      const syntheticEvent = {
        ...e,
        target: { value: e.target.value } as HTMLInputElement,
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleInputChange(syntheticEvent);
    }
  };

  const enhancedSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user && anonymousAiMessageCount >= ANONYMOUS_MESSAGE_LIMIT) {
      toast.error("Sorry, you've reached your rate limit");
      return;
    }

    if (user) {
      onSubmit(e, input);
    } else {
      if (!input.trim()) return;
      let activeChat = currentAnonymousChat;
      if (!activeChat) {
        const newChatId = await createNewChat();
        if (!newChatId) return;
        const currentChatsFromStorage = localStorage.getItem("anonymous_chats");
        const currentChats: LocalStorageChat[] = currentChatsFromStorage ? JSON.parse(currentChatsFromStorage) : [];
        activeChat = currentChats.find((c) => c.id === newChatId) || null;
        if (!activeChat) return;
      }

      const userMessage: Message = {
        id: `${Date.now()}_user`,
        role: "user",
        content: input,
        createdAt: new Date(),
      };

      saveUserMessageToLocalStorage(userMessage, activeChat);
      await append({ role: "user", content: input });
      setInput("");
    }
  };

  const handleQuestionClick = async (question: string) => {
    if (!user && anonymousAiMessageCount >= ANONYMOUS_MESSAGE_LIMIT) {
      toast.error("Sorry, you've reached your rate limit");
      return;
    }

    if (user) {
      let activeChatId = currentChatId;
      if (!activeChatId) {
        activeChatId = await createNewChat();
        if (!activeChatId) return;
      }

      try {
        await saveMessage({
          chatId: activeChatId as Id<"chats">,
          userId: user.id,
          role: "user",
          body: question,
        });

        const isFirstMessage = messages.length === 0;
        if (isFirstMessage) {
          const title = question.slice(0, 30) + (question.length > 30 ? "..." : "");
          try {
            await updateChatTitle({ chatId: activeChatId as Id<"chats">, title });
          } catch (error) {
            console.error("Failed to update chat title", error);
          }
        }

        await append({ role: "user", content: question });
      } catch (error) {
        console.error("Failed to process question", error);
      }
    } else {
      let activeChat = currentAnonymousChat;
      if (!activeChat) {
        const newChatId = await createNewChat();
        if (!newChatId) return;
        const currentChatsFromStorage = localStorage.getItem("anonymous_chats");
        const currentChats: LocalStorageChat[] = currentChatsFromStorage ? JSON.parse(currentChatsFromStorage) : [];
        activeChat = currentChats.find((c) => c.id === newChatId) || null;
        if (!activeChat) return;
      }

      const userMessage: Message = {
        id: `${Date.now()}_user`,
        role: "user",
        content: question,
        createdAt: new Date(),
      };

      saveUserMessageToLocalStorage(userMessage, activeChat);
      await append({ role: "user", content: question });
    }
  };

  const handleModelChange = (model: LLMModel) => {
    if (!user && model.id !== getDefaultAnonymousModel().id) {
      return;
    }
    setSelectedModel(model);
  };

  const sidebarChats = user
    ? chats?.map((chat) => ({ _id: chat._id, title: chat.title })) || []
    : anonymousChats.map((chat) => ({ _id: chat.id, title: chat.title }));

  return {
    user,
    messages,
    status,
    input,
    enhancedInputChange,
    handleKeyDown,
    enhancedSubmit,
    selectedModel,
    handleModelChange,
    bannerClosed,
    setBannerClosed,
    isAnonymousLimitReached,
    anonymousAiMessageCount,
    anonymousMessageCount,
    sidebarChats,
    handleQuestionClick,
    currentChatId,
    isCreatingChat,
    handleNewChat,
    handleChatSelect,
  };
}

