import { useState, useEffect, useRef, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { type Message } from "@ai-sdk/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  getDefaultModel,
  getDefaultAnonymousModel,
  getAvailableModels,
  type LLMModel,
} from "@/lib/models";
import {
  generateChatTitle,
  createUserMessage,
  ANONYMOUS_STORAGE_KEYS,
  getObjectFromStorage,
  setObjectInStorage,
} from "@/lib/chatHelpers";
import { toast } from "sonner";

interface LocalStorageChat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

interface ChatLogicOptions {
  chatId?: string;
  anonymousMessageCount?: number;
  anonymousAiMessageCount?: number;
  ANONYMOUS_MESSAGE_LIMIT?: number;
  onAnonymousAiMessageUpdate?: (count: number) => void;
  onAnonymousChatsUpdate?: (chats: LocalStorageChat[]) => void;
  onCurrentAnonymousChatUpdate?: (chat: LocalStorageChat | null) => void;
}

export function useChatLogic({
  chatId,
  anonymousAiMessageCount = 0,
  ANONYMOUS_MESSAGE_LIMIT = 10,
  onAnonymousAiMessageUpdate,
  onAnonymousChatsUpdate,
  onCurrentAnonymousChatUpdate,
}: ChatLogicOptions) {
  const { user } = useUser();

  // Model selection state
  const [selectedModel, setSelectedModel] = useState<LLMModel>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("selectedModel");
      if (stored) {
        try {
          const parsedModel = JSON.parse(stored) as LLMModel;
          const availableModels = user
            ? getAvailableModels()
            : [getDefaultAnonymousModel()];
          const isValidModel = availableModels.some(
            (m: LLMModel) => m.id === parsedModel.id
          );
          if (isValidModel) {
            return parsedModel;
          }
        } catch {
          // Ignore parsing errors and fall back to default
        }
      }
    }
    return user ? getDefaultModel() : getDefaultAnonymousModel();
  });

  // Anonymous chat state
  const [currentAnonymousChat, setCurrentAnonymousChat] =
    useState<LocalStorageChat | null>(null);

  // AI message processing state
  const lastProcessedAiMessageId = useRef<string | null>(null);
  const anonymousAiMessageCountRef = useRef(anonymousAiMessageCount);
  const currentAnonymousChatRef = useRef(currentAnonymousChat);

  // Keep refs in sync
  useEffect(() => {
    anonymousAiMessageCountRef.current = anonymousAiMessageCount;
  }, [anonymousAiMessageCount]);

  useEffect(() => {
    currentAnonymousChatRef.current = currentAnonymousChat;
  }, [currentAnonymousChat]);

  // Load current anonymous chat
  useEffect(() => {
    if (!user && chatId) {
      const chats = getObjectFromStorage<LocalStorageChat[]>(
        ANONYMOUS_STORAGE_KEYS.CHATS,
        []
      );
      const currentChat = chats.find((chat) => chat.id === chatId);
      if (currentChat) {
        setCurrentAnonymousChat(currentChat);
        onCurrentAnonymousChatUpdate?.(currentChat);
      }
    }
  }, [user, chatId, onCurrentAnonymousChatUpdate]);

  // Convex mutations and queries
  const saveMessage = useMutation(api.messages.saveMessage);
  const updateChatTitle = useMutation(api.messages.updateChatTitle);

  // Load messages from Convex for authenticated users
  const convexMessages = useQuery(
    api.messages.getMessages,
    user && chatId && typeof chatId === "string" && chatId.length > 10
      ? { chatId: chatId as Id<"chats"> }
      : "skip"
  );

  // Convert Convex messages to useChat format
  const convertedMessages: Message[] = useMemo(() => {
    return user && convexMessages
      ? convexMessages.map((msg) => ({
          id: msg._id,
          role: msg.role,
          content: msg.body,
          createdAt: new Date(msg._creationTime),
        }))
      : [];
  }, [user, convexMessages]);

  // Save user message to localStorage for anonymous users
  const saveUserMessageToLocalStorage = (
    userMessage: Message,
    chatToUpdate: LocalStorageChat
  ) => {
    const updatedMessages = [...chatToUpdate.messages, userMessage];
    const updatedChat = { ...chatToUpdate, messages: updatedMessages };

    const chats = getObjectFromStorage<LocalStorageChat[]>(
      ANONYMOUS_STORAGE_KEYS.CHATS,
      []
    );
    const updatedChats = chats.map((chat) =>
      chat.id === chatToUpdate.id ? updatedChat : chat
    );

    setObjectInStorage(ANONYMOUS_STORAGE_KEYS.CHATS, updatedChats);
    setCurrentAnonymousChat(updatedChat);
    onAnonymousChatsUpdate?.(updatedChats);
    onCurrentAnonymousChatUpdate?.(updatedChat);
  };

  // Handle AI message finish callback
  const handleAiMessageFinish = async (message: Message) => {
    // Prevent duplicate onFinish calls
    if (lastProcessedAiMessageId.current === message.id) {
      return;
    }
    lastProcessedAiMessageId.current = message.id;

    if (user) {
      // For authenticated users, save AI response to Convex
      try {
        if (chatId && typeof chatId === "string" && chatId.length > 10) {
          await saveMessage({
            chatId: chatId as Id<"chats">,
            userId: user.id,
            role: "assistant",
            body: message.content,
          });
        }
      } catch (error) {
        console.error("Failed to save AI message:", error);
      }
    } else {
      // For anonymous users, save AI response to localStorage
      const currentChat = currentAnonymousChatRef.current;
      if (currentChat) {
        const updatedMessages = [...currentChat.messages, message];
        const updatedChat = { ...currentChat, messages: updatedMessages };

        // Update chats array
        const chats = getObjectFromStorage<LocalStorageChat[]>(
          ANONYMOUS_STORAGE_KEYS.CHATS,
          []
        );
        const updatedChats = chats.map((chat) =>
          chat.id === currentChat.id ? updatedChat : chat
        );

        setObjectInStorage(ANONYMOUS_STORAGE_KEYS.CHATS, updatedChats);
        setCurrentAnonymousChat(updatedChat);
        onAnonymousChatsUpdate?.(updatedChats);
        onCurrentAnonymousChatUpdate?.(updatedChat);

        // Update anonymous AI message count
        onAnonymousAiMessageUpdate?.(anonymousAiMessageCountRef.current + 1);
      }
    }
  };

  // Enhanced submit handler
  const createEnhancedSubmit = (
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void,
    append: (message: {
      role: "user";
      content: string;
    }) => Promise<string | null | undefined>,
    input: string,
    setInput: (value: string) => void,
    messages: Message[]
  ) => {
    return async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Check anonymous message limit
      if (!user && anonymousAiMessageCount >= ANONYMOUS_MESSAGE_LIMIT) {
        toast.error("Sorry, you've reached your rate limit");
        return;
      }

      if (user) {
        // For authenticated users, save user message before AI flow
        if (
          chatId &&
          typeof chatId === "string" &&
          chatId.length > 10 &&
          input.trim()
        ) {
          try {
            await saveMessage({
              chatId: chatId as Id<"chats">,
              userId: user.id,
              role: "user",
              body: input,
            });

            // Update chat title if this is the first message
            if (messages.length === 0) {
              const title = generateChatTitle(input);
              try {
                await updateChatTitle({
                  chatId: chatId as Id<"chats">,
                  title,
                });
              } catch (error) {
                console.error("Failed to update chat title:", error);
              }
            }
          } catch (error) {
            console.error("Failed to save user message:", error);
          }
        }

        handleSubmit(e);
      } else {
        // For anonymous users
        if (!input.trim()) return;

        const activeChat = currentAnonymousChat;
        if (!activeChat) {
          toast.error("Please create a new chat first");
          return;
        }

        // Create and save user message
        const userMessage = createUserMessage(input);
        saveUserMessageToLocalStorage(userMessage, activeChat);

        // Use append for AI response
        await append({
          role: "user",
          content: input,
        });

        setInput("");
      }
    };
  };

  // Handle model change
  const handleModelChange = (model: LLMModel) => {
    if (!user && model.id !== getDefaultAnonymousModel().id) {
      return;
    }

    setSelectedModel(model);

    if (user) {
      localStorage.setItem("selectedModel", JSON.stringify(model));
    }
  };

  return {
    // State
    selectedModel,
    currentAnonymousChat,
    convertedMessages,

    // Functions
    handleAiMessageFinish,
    createEnhancedSubmit,
    handleModelChange,
    saveUserMessageToLocalStorage,
  };
}
