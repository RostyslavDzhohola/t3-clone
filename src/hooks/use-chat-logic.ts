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
  LocalStorageChat,
  ANONYMOUS_MESSAGE_LIMIT,
  MODEL_STORAGE_KEY,
} from "@/lib/constants";
import {
  generateChatTitle,
  createUserMessage,
  setStringInStorage,
  getStringFromStorage,
} from "@/lib/chatHelpers";
import { toast } from "sonner";

interface ChatLogicOptions {
  chatId?: string;
  anonymousMessageCount?: number;
  anonymousAiMessageCount?: number;
  ANONYMOUS_MESSAGE_LIMIT?: number;
  onAnonymousAiMessageUpdate?: (count: number) => void;
  onAnonymousChatsUpdate?: (chats: LocalStorageChat[]) => void;
  onCurrentAnonymousChatUpdate?: (chat: LocalStorageChat | null) => void;
  // Anonymous chat operations from useChatManagement
  addMessageToAnonymousChat?: (message: Message, chatId: string) => void;
  currentAnonymousChat?: LocalStorageChat | null;
}

export function useChatLogic({
  chatId,
  anonymousAiMessageCount = 0,
  ANONYMOUS_MESSAGE_LIMIT: messageLimitProp = ANONYMOUS_MESSAGE_LIMIT,
  onAnonymousAiMessageUpdate,
  addMessageToAnonymousChat,
  currentAnonymousChat,
}: ChatLogicOptions) {
  const { user } = useUser();

  // Model selection state
  const [selectedModel, setSelectedModel] = useState<LLMModel>(() => {
    if (typeof window !== "undefined") {
      const stored = getStringFromStorage(MODEL_STORAGE_KEY);
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

  // AI message processing state
  const lastProcessedAiMessageId = useRef<string | null>(null);
  const anonymousAiMessageCountRef = useRef(anonymousAiMessageCount);

  // Keep refs in sync
  useEffect(() => {
    anonymousAiMessageCountRef.current = anonymousAiMessageCount;
  }, [anonymousAiMessageCount]);

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
      // For anonymous users, use centralized chat management
      if (currentAnonymousChat && addMessageToAnonymousChat) {
        addMessageToAnonymousChat(message, currentAnonymousChat.id);
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
      if (!user && anonymousAiMessageCount >= messageLimitProp) {
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

        if (!currentAnonymousChat) {
          toast.error("Please create a new chat first");
          return;
        }

        // Create and save user message using centralized management
        const userMessage = createUserMessage(input);
        if (addMessageToAnonymousChat) {
          addMessageToAnonymousChat(userMessage, currentAnonymousChat.id);
        }

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
      setStringInStorage(MODEL_STORAGE_KEY, JSON.stringify(model));
    }
  };

  return {
    // State
    selectedModel,
    convertedMessages,

    // Functions
    handleAiMessageFinish,
    createEnhancedSubmit,
    handleModelChange,
  };
}
