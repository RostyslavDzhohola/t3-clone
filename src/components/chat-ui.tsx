"use client";

import React from "react";
import { useChat, type Message } from "@ai-sdk/react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useState, useRef } from "react";
import { Id } from "../../convex/_generated/dataModel";
// Removed unused import: useMessageInput
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
import ChatContent from "./chat-content";
import MessageInput from "./message-input";
import RemainingLimitBanner from "./remaining-limit-banner";
import DataFastWidget from "./data-fast-widget";
import { toast } from "sonner";

interface LocalStorageChat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

interface ChatUIProps {
  chatId?: string;
  anonymousMessageCount?: number;
  anonymousAiMessageCount?: number;
  isAnonymousLimitReached?: boolean;
  ANONYMOUS_MESSAGE_LIMIT?: number;
  onAnonymousAiMessageUpdate?: (count: number) => void;
  onAnonymousChatsUpdate?: (chats: LocalStorageChat[]) => void;
  onCurrentAnonymousChatUpdate?: (chat: LocalStorageChat | null) => void;
}

export default function ChatUI({
  chatId,
  anonymousMessageCount = 0,
  anonymousAiMessageCount = 0,
  isAnonymousLimitReached = false,
  ANONYMOUS_MESSAGE_LIMIT = 10,
  onAnonymousAiMessageUpdate,
  onAnonymousChatsUpdate,
  onCurrentAnonymousChatUpdate,
}: ChatUIProps) {
  const { user } = useUser();

  const [selectedModel, setSelectedModel] = useState<LLMModel>(() => {
    // Load persisted model from localStorage or use default
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("selectedModel");
      if (stored) {
        try {
          const parsedModel = JSON.parse(stored) as LLMModel;
          // Validate that the stored model still exists and is available
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

  const [bannerClosed, setBannerClosed] = useState(false);
  const [currentAnonymousChat, setCurrentAnonymousChat] =
    useState<LocalStorageChat | null>(null);

  // Keep track of the last AI message we've processed so onFinish only
  // executes once per AI response
  const lastProcessedAiMessageId = useRef<string | null>(null);

  // Use refs to track anonymous counts to avoid dependencies in onFinish callback
  const anonymousAiMessageCountRef = useRef(anonymousAiMessageCount);
  const currentAnonymousChatRef = useRef(currentAnonymousChat);

  // Keep refs in sync with state
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

  // Convex mutations
  const saveMessage = useMutation(api.messages.saveMessage);
  const updateChatTitle = useMutation(api.messages.updateChatTitle);

  // Set up useChat hook
  const {
    messages,
    input,
    setInput,
    append,
    handleInputChange,
    handleSubmit,
    status,
  } = useChat({
    api: "/api/chat",
    body: {
      model: selectedModel.id,
      chatId: user ? chatId : undefined,
    },
    initialMessages: user ? undefined : currentAnonymousChat?.messages || [],
    onFinish: async (message: Message) => {
      // Prevent duplicate onFinish calls
      if (lastProcessedAiMessageId.current === message.id) {
        console.log("⚠️ Duplicate onFinish detected, skipping");
        return;
      }
      lastProcessedAiMessageId.current = message.id;

      console.log("🎯 onFinish called with message:", message);

      if (user) {
        // For authenticated users, save AI response to Convex
        try {
          if (chatId && typeof chatId === "string" && chatId.length > 10) {
            console.log("💾 Saving AI message to Convex...");
            const messageId = await saveMessage({
              chatId: chatId as Id<"chats">,
              userId: user.id,
              role: "assistant",
              body: message.content,
            });
            console.log("✅ AI message saved with ID:", messageId);
          }
        } catch (error) {
          console.error("❌ Failed to save AI message:", error);
        }
      } else {
        // For anonymous users, save AI response to localStorage
        console.log("💾 Saving AI message to localStorage...");
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
        }

        // Increment anonymous AI message count
        const newCount = anonymousAiMessageCountRef.current + 1;
        onAnonymousAiMessageUpdate?.(newCount);
        console.log("📊 Anonymous AI message count updated to:", newCount);
      }
    },
    onError: (error) => {
      console.error("Chat error:", error);
      toast.error("Something went wrong. Please try again.");
    },
  });

  // Message input handling - removed unnecessary hook

  // Save user message to localStorage for anonymous users
  const saveUserMessageToLocalStorage = (
    userMessage: Message,
    chatToUpdate: LocalStorageChat
  ) => {
    const updatedMessages = [...chatToUpdate.messages, userMessage];
    const updatedChat = { ...chatToUpdate, messages: updatedMessages };

    // Update chats array
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

    console.log("💾 User message saved to localStorage");
  };

  // Enhanced input change handler
  const enhancedInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(e);
  };

  // Enhanced submit handler
  const enhancedSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Check anonymous message limit
    if (!user && anonymousAiMessageCount >= ANONYMOUS_MESSAGE_LIMIT) {
      toast.error("Sorry, you've reached your rate limit");
      return;
    }

    if (user) {
      // For authenticated users, save user message before letting useChat handle the flow
      if (
        chatId &&
        typeof chatId === "string" &&
        chatId.length > 10 &&
        input.trim()
      ) {
        try {
          console.log("💾 Saving user message to Convex...");
          const messageId = await saveMessage({
            chatId: chatId as Id<"chats">,
            userId: user.id,
            role: "user",
            body: input,
          });
          console.log("✅ User message saved with ID:", messageId);

          // Update chat title if this is the first message
          if (messages.length === 0) {
            const title = generateChatTitle(input);
            try {
              console.log("🏷️ Updating chat title to:", title);
              await updateChatTitle({
                chatId: chatId as Id<"chats">,
                title,
              });
              console.log("✅ Chat title updated");
            } catch (error) {
              console.error("❌ Failed to update chat title:", error);
            }
          }
        } catch (error) {
          console.error("❌ Failed to save user message:", error);
        }
      }

      // Now let useChat handle the AI flow
      handleSubmit(e);
    } else {
      // For anonymous users, handle submission differently
      if (!input.trim()) return;

      // Ensure we have an anonymous chat
      const activeChat = currentAnonymousChat;
      if (!activeChat) {
        console.error("❌ No active anonymous chat for message submission");
        toast.error("Please create a new chat first");
        return;
      }

      // Create user message
      const userMessage = createUserMessage(input);

      // Save user message to localStorage immediately BEFORE calling append
      saveUserMessageToLocalStorage(userMessage, activeChat);

      // Use append instead of handleSubmit to avoid state conflicts
      await append({
        role: "user",
        content: input,
      });

      // Clear the input field for anonymous users
      setInput("");
    }
  };

  // Handle model change (restrict for anonymous users)
  const handleModelChange = (model: LLMModel) => {
    if (!user && model.id !== getDefaultAnonymousModel().id) {
      // Anonymous users can only use Gemini 2.5 Flash
      return;
    }

    // Update the selected model
    setSelectedModel(model);

    // Persist to localStorage for authenticated users
    if (user) {
      localStorage.setItem("selectedModel", JSON.stringify(model));
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50 relative">
      <DataFastWidget />

      <ChatContent
        messages={messages}
        status={status}
        isAnonymous={!user}
        anonymousMessageCount={user ? undefined : anonymousMessageCount}
        anonymousMessageLimit={user ? undefined : ANONYMOUS_MESSAGE_LIMIT}
      />

      {/* Floating Message Input Overlay */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-center pt-4 z-40 pointer-events-none">
        <div className="w-full max-w-3xl pointer-events-auto px-4">
          <div className="backdrop-blur-xs border border-gray-200 rounded-t-2xl shadow-lg px-2 pt-2">
            <MessageInput
              input={input}
              onInputChange={enhancedInputChange}
              onSubmit={enhancedSubmit}
              disabled={status !== "ready"}
              placeholder={
                !user
                  ? "Type your message here... (Anonymous mode)"
                  : "Type your message here..."
              }
              selectedModel={selectedModel}
              onModelChange={handleModelChange}
            />
          </div>
        </div>
      </div>

      {!user && !bannerClosed && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50">
          {(() => {
            const remaining = Math.max(
              0,
              ANONYMOUS_MESSAGE_LIMIT - anonymousAiMessageCount
            );
            return (
              <RemainingLimitBanner
                remaining={remaining}
                limitReached={isAnonymousLimitReached}
                onClose={() => setBannerClosed(true)}
              />
            );
          })()}
        </div>
      )}
    </div>
  );
}
