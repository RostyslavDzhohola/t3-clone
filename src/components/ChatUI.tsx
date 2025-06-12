"use client";

import React from "react";
import { useChat, type Message } from "@ai-sdk/react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useState } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { useRouter, usePathname } from "next/navigation";
import { useMessageInput } from "../hooks";
import { getDefaultModel, type LLMModel } from "@/lib/models";
import Sidebar from "./Sidebar";
import ChatContent from "./ChatContent";

export default function ChatUI() {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [currentChatId, setCurrentChatId] = useState<Id<"chats"> | null>(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [selectedModel, setSelectedModel] = useState<LLMModel>(
    getDefaultModel()
  );

  // Convex mutations and queries
  const createChat = useMutation(api.messages.createChat);
  const saveMessage = useMutation(api.messages.saveMessage);
  const updateChatTitle = useMutation(api.messages.updateChatTitle);

  const chats = useQuery(
    api.messages.getChats,
    user ? { userId: user.id } : "skip"
  );
  const currentChatMessages = useQuery(
    api.messages.getMessages,
    currentChatId ? { chatId: currentChatId } : "skip"
  );

  // Debug logging
  useEffect(() => {
    console.log("🔍 Debug Info:", {
      user: user?.id,
      currentChatId,
      chatsCount: chats?.length,
      messagesCount: currentChatMessages?.length,
      isCreatingChat,
    });
  }, [user, currentChatId, chats, currentChatMessages, isCreatingChat]);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    setMessages,
  } = useChat({
    api: "/api/chat",
    body: {
      model: selectedModel.id,
    },
    onFinish: async (message: Message) => {
      console.log(
        "💬 AI message finished:",
        message.content.slice(0, 50) + "..."
      );

      // Save AI response to Convex
      if (user && currentChatId) {
        try {
          console.log("💾 Saving AI message to Convex...");
          const messageId = await saveMessage({
            chatId: currentChatId,
            userId: user.id,
            role: "assistant",
            body: message.content,
          });
          console.log("✅ AI message saved with ID:", messageId);
        } catch (error) {
          console.error("❌ Failed to save AI message:", error);
        }
      } else {
        console.warn("⚠️ Cannot save AI message - missing user or chatId");
      }
    },
  });

  // Create a new chat
  const createNewChat = async () => {
    if (!user) {
      console.warn("⚠️ Cannot create chat - user not authenticated");
      return null;
    }

    if (isCreatingChat) {
      console.warn("⚠️ Already creating a chat, skipping...");
      return null;
    }

    console.log("🆕 Creating new chat...");
    setIsCreatingChat(true);

    try {
      const chatId = await createChat({
        userId: user.id,
        title: "New Chat",
      });

      console.log("✅ Chat created with ID:", chatId);
      setCurrentChatId(chatId);
      setMessages([]); // Clear current messages

      // Navigate to the new chat URL
      router.push(`/chat/${chatId}`);

      return chatId;
    } catch (error) {
      console.error("❌ Failed to create new chat:", error);
      return null;
    } finally {
      setIsCreatingChat(false);
    }
  };

  // Use the message input hook
  const {
    handleInputChangeWithAutoCreate,
    onSubmit,
    handleKeyDown: hookHandleKeyDown,
  } = useMessageInput({
    user,
    currentChatId,
    saveMessage,
    updateChatTitle,
    createNewChat,
    setCurrentChatId,
    messages,
    handleSubmit,
  });

  // Create enhanced key down handler for textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const syntheticEvent = {
      ...e,
      target: { value: e.currentTarget.value } as HTMLInputElement,
    } as unknown as React.KeyboardEvent<HTMLInputElement>;
    hookHandleKeyDown(syntheticEvent);
  };

  // Handle New Chat button
  const handleNewChat = async () => {
    console.log("🖱️ New Chat button clicked");
    await createNewChat();
  };

  // Switch to a different chat
  const handleChatSelect = (chatId: Id<"chats">) => {
    console.log("🔄 Switching to chat:", chatId);
    setCurrentChatId(chatId);
    router.push(`/chat/${chatId}`);
  };

  // Load messages when current chat changes
  useEffect(() => {
    if (currentChatMessages) {
      console.log(
        "📨 Loading messages for current chat:",
        currentChatMessages.length
      );
      const formattedMessages: Message[] = currentChatMessages.map((msg) => ({
        id: msg._id,
        role: msg.role,
        content: msg.body,
        createdAt: new Date(msg._creationTime),
      }));
      setMessages(formattedMessages);
    } else {
      setMessages([]);
    }
  }, [currentChatMessages, setMessages]);

  // Auto-select first chat if none selected and we're on the home page
  useEffect(() => {
    if (pathname === "/" && chats && chats.length > 0 && !currentChatId) {
      const firstChat = chats[0];
      console.log("🏠 Auto-selecting first chat:", firstChat._id);
      setCurrentChatId(firstChat._id);
      router.push(`/chat/${firstChat._id}`);
    }
  }, [chats, currentChatId, pathname, router]);

  // Extract chat ID from URL if we're on a chat page
  useEffect(() => {
    if (pathname.startsWith("/chat/")) {
      const chatIdFromUrl = pathname.split("/chat/")[1];
      if (chatIdFromUrl && chatIdFromUrl !== currentChatId) {
        console.log("🔗 Setting chat ID from URL:", chatIdFromUrl);
        setCurrentChatId(chatIdFromUrl as Id<"chats">);
      }
    }
  }, [pathname, currentChatId]);

  // Create enhanced input change handler
  const enhancedInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Create a synthetic input event for the useChat hook
    const syntheticEvent = {
      ...e,
      target: { value: e.target.value } as HTMLInputElement,
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    handleInputChangeWithAutoCreate(syntheticEvent, handleInputChange);
  };

  // Create enhanced submit handler
  const enhancedSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    onSubmit(e, input);
  };

  return (
    <div className="flex h-screen w-full bg-gray-50">
      <Sidebar
        user={user}
        chats={chats}
        currentChatId={currentChatId}
        isCreatingChat={isCreatingChat}
        onNewChat={handleNewChat}
        onChatSelect={handleChatSelect}
      />
      <ChatContent
        user={user}
        messages={messages}
        status={status}
        input={input}
        onInputChange={enhancedInputChange}
        onKeyDown={handleKeyDown}
        onSubmit={enhancedSubmit}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
      />
    </div>
  );
}
