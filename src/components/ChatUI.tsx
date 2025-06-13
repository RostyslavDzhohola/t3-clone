"use client";

import React, { useEffect, useState } from "react";
import { useChat, type Message } from "@ai-sdk/react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useRouter, usePathname } from "next/navigation";
import {
  useAnonymousChat,
  useChatManagement,
  useMessageHandling,
} from "../hooks";
import {
  getDefaultModel,
  getDefaultAnonymousModel,
  type LLMModel,
} from "@/lib/models";
import Sidebar from "./Sidebar";
import ChatContent from "./ChatContent";

export default function ChatUI() {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [selectedModel, setSelectedModel] = useState<LLMModel>(
    user ? getDefaultModel() : getDefaultAnonymousModel()
  );
  const [previousUserId, setPreviousUserId] = useState<string | null>(null);
  const [pendingUserMessage, setPendingUserMessage] = useState<{
    content: string;
    isFirstMessage: boolean;
  } | null>(null);

  // Anonymous chat management
  const anonymousChat = useAnonymousChat();

  // Chat management (creation, selection, navigation)
  const chatManagement = useChatManagement({ user, anonymousChat });

  // Message handling (saving to Convex/localStorage)
  const messageHandling = useMessageHandling({
    user,
    currentChatId: chatManagement.currentChatId,
    anonymousChat,
  });

  // Convex queries (only for authenticated users)
  const chats = useQuery(
    api.messages.getChats,
    user ? { userId: user.id } : "skip"
  );
  const currentChatMessages = useQuery(
    api.messages.getMessages,
    user &&
      chatManagement.currentChatId &&
      typeof chatManagement.currentChatId === "string" &&
      !chatManagement.currentChatId.startsWith("anon_") &&
      chatManagement.currentChatId.length > 10
      ? { chatId: chatManagement.currentChatId as Id<"chats"> }
      : "skip"
  );

  // Watch for user sign out to reset anonymous data
  useEffect(() => {
    if (previousUserId && !user) {
      console.log("👋 User signed out, clearing anonymous data");
      anonymousChat.clearAnonymousData();
      chatManagement.setCurrentChatId(null);
    }
    setPreviousUserId(user?.id || null);
  }, [user, previousUserId, anonymousChat, chatManagement]);

  // Update model selection based on user authentication
  useEffect(() => {
    if (user) {
      setSelectedModel(getDefaultModel());
    } else {
      setSelectedModel(getDefaultAnonymousModel());
    }
  }, [user]);

  // useChat hook with proper message handling
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
    },
    onFinish: async (message: Message) => {
      console.log(
        "💬 AI message finished:",
        message.content.slice(0, 50) + "..."
      );

      // Save AI message
      await messageHandling.handleAssistantMessage(message);

      // For authenticated users, save the pending user message that triggered this response
      if (user && pendingUserMessage) {
        console.log(
          "💾 Saving pending user message to Convex after AI response..."
        );
        const userMessage: Message = {
          id: `${Date.now()}_user`,
          role: "user",
          content: pendingUserMessage.content,
          createdAt: new Date(),
        };
        await messageHandling.handleUserMessage(
          userMessage,
          pendingUserMessage.isFirstMessage
        );
        setPendingUserMessage(null); // Clear the pending message
      }
    },
  });

  // For authenticated users, we'll handle auto-chat creation manually in the input handler

  // Load messages when current chat changes
  useEffect(() => {
    if (user && currentChatMessages) {
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
    } else if (!user && anonymousChat.currentAnonymousChat) {
      console.log(
        "📨 Loading anonymous messages:",
        anonymousChat.currentAnonymousChat.messages.length
      );
      // For anonymous users, we need to sync localStorage messages with useChat
      setMessages(anonymousChat.currentAnonymousChat.messages);
    } else {
      setMessages([]);
    }
  }, [
    user,
    currentChatMessages,
    anonymousChat.currentAnonymousChat,
    setMessages,
  ]);

  // Auto-select first chat if none selected and we're on the home page
  useEffect(() => {
    if (pathname === "/" && !chatManagement.currentChatId) {
      if (user && chats && chats.length > 0) {
        const firstChat = chats[0];
        console.log("🏠 Auto-selecting first chat:", firstChat._id);
        chatManagement.setCurrentChatId(firstChat._id);
        router.push(`/chat/${firstChat._id}`);
      } else if (!user && anonymousChat.anonymousChats.length > 0) {
        const firstChat = anonymousChat.anonymousChats[0];
        console.log("🏠 Auto-selecting first anonymous chat:", firstChat.id);
        anonymousChat.setCurrentAnonymousChat(firstChat);
        chatManagement.setCurrentChatId(firstChat.id);
      }
    }
  }, [
    user,
    chats,
    anonymousChat.anonymousChats,
    chatManagement.currentChatId,
    pathname,
    router,
    chatManagement,
    anonymousChat,
  ]);

  // Extract chat ID from URL if we're on a chat page (only for authenticated users)
  useEffect(() => {
    if (user && pathname.startsWith("/chat/")) {
      const chatIdFromUrl = pathname.split("/chat/")[1];
      if (chatIdFromUrl && chatIdFromUrl !== chatManagement.currentChatId) {
        console.log("🔗 Setting chat ID from URL:", chatIdFromUrl);
        chatManagement.setCurrentChatId(chatIdFromUrl as Id<"chats">);
      }
    }
  }, [user, pathname, chatManagement.currentChatId, chatManagement]);

  // Enhanced input change handler
  const enhancedInputChange = async (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    // Check anonymous message limit
    if (!user && anonymousChat.isAnonymousLimitReached) {
      return;
    }

    // Convert textarea event to input event for useChat
    const syntheticEvent = {
      ...e,
      target: { value: e.target.value } as HTMLInputElement,
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    // Handle input change
    handleInputChange(syntheticEvent);

    // Auto-create chat for authenticated users when they start typing
    if (user && !chatManagement.currentChatId && e.target.value.trim()) {
      console.log("⌨️ Auto-creating chat because user started typing");
      const newChatId = await chatManagement.createNewChat();
      if (newChatId) {
        chatManagement.setCurrentChatId(newChatId as Id<"chats">);
      }
    }
  };

  // Enhanced submit handler with proper message persistence
  const enhancedSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Check anonymous message limit (need 2 messages: user + AI)
    if (
      !user &&
      (anonymousChat.isAnonymousLimitReached ||
        anonymousChat.anonymousMessageCount + 2 >
          anonymousChat.ANONYMOUS_MESSAGE_LIMIT)
    ) {
      anonymousChat.incrementMessageCount(); // This will trigger the limit
      return;
    }

    if (!input.trim()) return;

    // Ensure we have a chat
    let activeChatId = chatManagement.currentChatId;
    if (!activeChatId) {
      console.log("🆕 No active chat, creating one for message submission");
      activeChatId = await chatManagement.createNewChat();
      if (!activeChatId) {
        console.error("❌ Failed to create chat for message");
        return;
      }
    }

    if (user) {
      // For authenticated users, store the user message to save it after AI response
      setPendingUserMessage({
        content: input,
        isFirstMessage: messages.length === 0,
      });

      // Let useChat handle the submission
      handleSubmit(e);
    } else {
      // For anonymous users, we need to handle message persistence manually
      const userMessage: Message = {
        id: `${Date.now()}_user`,
        role: "user",
        content: input,
        createdAt: new Date(),
      };

      // Save user message to localStorage BEFORE calling append
      await messageHandling.handleUserMessage(
        userMessage,
        messages.length === 0
      );

      // Update the useChat messages state to include the user message
      // This ensures the user message stays visible during AI generation
      setMessages((prev) => [...prev, userMessage]);

      // Use append to send the message and trigger AI response
      await append({
        role: "user",
        content: input,
      });

      // Clear input
      setInput("");
    }
  };

  // Handle question click from WelcomeScreen
  const handleQuestionClick = async (question: string) => {
    console.log("🤔 Question clicked:", question);

    // Check anonymous message limit
    if (
      !user &&
      (anonymousChat.isAnonymousLimitReached ||
        anonymousChat.anonymousMessageCount + 2 >
          anonymousChat.ANONYMOUS_MESSAGE_LIMIT)
    ) {
      anonymousChat.incrementMessageCount(); // This will trigger the limit
      return;
    }

    // Ensure we have a chat
    let activeChatId = chatManagement.currentChatId;
    if (!activeChatId) {
      console.log("🆕 No active chat, creating one for question");
      activeChatId = await chatManagement.createNewChat();
      if (!activeChatId) {
        console.error("❌ Failed to create chat for question");
        return;
      }
    }

    if (user) {
      // For authenticated users, store the question to save it after AI response
      setPendingUserMessage({
        content: question,
        isFirstMessage: messages.length === 0,
      });

      // Let useChat handle the submission
      await append({
        role: "user",
        content: question,
      });
    } else {
      // For anonymous users, handle message persistence manually
      const userMessage: Message = {
        id: `${Date.now()}_user`,
        role: "user",
        content: question,
        createdAt: new Date(),
      };

      // Save to localStorage first
      await messageHandling.handleUserMessage(
        userMessage,
        messages.length === 0
      );
      setMessages((prev) => [...prev, userMessage]);

      // Send to AI
      await append({
        role: "user",
        content: question,
      });
    }
  };

  // Handle model change (restrict for anonymous users)
  const handleModelChange = (model: LLMModel) => {
    if (!user && model.id !== getDefaultAnonymousModel().id) {
      // Anonymous users can only use Gemini 2.5 Flash
      return;
    }
    setSelectedModel(model);
  };

  // Create enhanced key down handler for textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.closest("form");
      if (form) {
        const submitEvent = new Event("submit", {
          bubbles: true,
          cancelable: true,
        });
        form.dispatchEvent(submitEvent);
      }
    }
  };

  // Prepare chat list for sidebar
  const sidebarChats = user
    ? chats?.map((chat) => ({ _id: chat._id, title: chat.title })) || []
    : anonymousChat.anonymousChats.map((chat) => ({
        _id: chat.id,
        title: chat.title,
      }));

  // Debug logging
  useEffect(() => {
    console.log("🔍 Debug Info:", {
      user: user?.id,
      currentChatId: chatManagement.currentChatId,
      chatsCount: user ? chats?.length : anonymousChat.anonymousChats.length,
      messagesCount: user
        ? currentChatMessages?.length
        : anonymousChat.currentAnonymousChat?.messages.length,
      isCreatingChat: chatManagement.isCreatingChat,
      anonymousMessageCount: anonymousChat.anonymousMessageCount,
      isAnonymousLimitReached: anonymousChat.isAnonymousLimitReached,
      useChatMessagesCount: messages.length,
    });
  }, [
    user,
    chatManagement.currentChatId,
    chats,
    currentChatMessages,
    chatManagement.isCreatingChat,
    anonymousChat.anonymousChats,
    anonymousChat.currentAnonymousChat,
    anonymousChat.anonymousMessageCount,
    anonymousChat.isAnonymousLimitReached,
    messages.length,
  ]);

  return (
    <div className="flex h-screen w-full bg-gray-50 relative">
      {/* DataFast Widget - top right corner */}
      <a
        href="https://datafa.st/share/684a2754569da665c6b838ca?realtime=1"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-1 right-4 z-50 w-fit h-6 p-0 m-0 overflow-hidden rounded-sm bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
        title="View DataFast Analytics Dashboard"
      >
        <iframe
          src="https://datafa.st/widgets/684a2754569da665c6b838ca/realtime?mainTextSize=10&primaryColor=%233cda10"
          style={{
            background: "transparent",
            border: "none",
            width: "200px",
            height: "24px",
            margin: "1px -10px",
            padding: "0",
            transform: "scale(1.1)",
            transformOrigin: "center",
            pointerEvents: "none",
          }}
          allowTransparency={true}
          title="DataFast Widget"
          loading="lazy"
        />
      </a>
      <Sidebar
        user={user}
        chats={sidebarChats}
        currentChatId={chatManagement.currentChatId}
        isCreatingChat={chatManagement.isCreatingChat}
        onNewChat={chatManagement.createNewChat}
        onChatSelect={chatManagement.selectChat}
        isAnonymousLimitReached={
          user ? undefined : anonymousChat.isAnonymousLimitReached
        }
      />
      <ChatContent
        messages={messages}
        status={status}
        input={input}
        onInputChange={enhancedInputChange}
        onKeyDown={handleKeyDown}
        onSubmit={enhancedSubmit}
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
        onQuestionClick={handleQuestionClick}
        isAnonymous={!user}
        isAnonymousLimitReached={
          user ? false : anonymousChat.isAnonymousLimitReached
        }
        anonymousMessageCount={
          user ? undefined : anonymousChat.anonymousMessageCount
        }
        anonymousMessageLimit={
          user ? undefined : anonymousChat.ANONYMOUS_MESSAGE_LIMIT
        }
      />
    </div>
  );
}
