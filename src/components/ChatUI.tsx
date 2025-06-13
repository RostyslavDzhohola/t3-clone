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
import {
  getDefaultModel,
  getDefaultAnonymousModel,
  type LLMModel,
} from "@/lib/models";
import Sidebar from "./Sidebar";
import ChatContent from "./ChatContent";

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

export default function ChatUI() {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [currentChatId, setCurrentChatId] = useState<
    Id<"chats"> | string | null
  >(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [selectedModel, setSelectedModel] = useState<LLMModel>(
    user ? getDefaultModel() : getDefaultAnonymousModel()
  );
  const [previousUserId, setPreviousUserId] = useState<string | null>(null);

  // Anonymous user state
  const [anonymousMessageCount, setAnonymousMessageCount] = useState(0);
  const [anonymousChats, setAnonymousChats] = useState<LocalStorageChat[]>([]);
  const [currentAnonymousChat, setCurrentAnonymousChat] =
    useState<LocalStorageChat | null>(null);
  const [isAnonymousLimitReached, setIsAnonymousLimitReached] = useState(false);

  // Helper function to clear anonymous data
  const clearAnonymousData = () => {
    console.log("🧹 Clearing anonymous data from localStorage");
    localStorage.removeItem(ANONYMOUS_STORAGE_KEY);
    localStorage.removeItem(ANONYMOUS_CHATS_KEY);
    localStorage.removeItem(ANONYMOUS_CURRENT_CHAT_KEY);
    setAnonymousMessageCount(0);
    setAnonymousChats([]);
    setCurrentAnonymousChat(null);
    setCurrentChatId(null);
    setIsAnonymousLimitReached(false);
  };

  // Watch for user sign out to reset anonymous data
  useEffect(() => {
    if (previousUserId && !user) {
      // User has signed out
      console.log("👋 User signed out, clearing anonymous data");
      clearAnonymousData();
    }
    setPreviousUserId(user?.id || null);
  }, [user, previousUserId]);

  // Load anonymous data from localStorage
  useEffect(() => {
    if (!user) {
      const savedCount = localStorage.getItem(ANONYMOUS_STORAGE_KEY);
      const count = savedCount ? parseInt(savedCount, 10) : 0;
      setAnonymousMessageCount(count);
      setIsAnonymousLimitReached(count >= ANONYMOUS_MESSAGE_LIMIT);

      const savedChats = localStorage.getItem(ANONYMOUS_CHATS_KEY);
      const chats = savedChats ? JSON.parse(savedChats) : [];
      setAnonymousChats(chats);

      const savedCurrentChatId = localStorage.getItem(
        ANONYMOUS_CURRENT_CHAT_KEY
      );
      if (savedCurrentChatId && chats.length > 0) {
        const currentChat = chats.find(
          (chat: LocalStorageChat) => chat.id === savedCurrentChatId
        );
        if (currentChat) {
          setCurrentAnonymousChat(currentChat);
          setCurrentChatId(savedCurrentChatId);
        }
      }
    }
  }, [user]);

  // Save anonymous message count to localStorage
  useEffect(() => {
    if (!user) {
      localStorage.setItem(
        ANONYMOUS_STORAGE_KEY,
        anonymousMessageCount.toString()
      );
      setIsAnonymousLimitReached(
        anonymousMessageCount >= ANONYMOUS_MESSAGE_LIMIT
      );
    }
  }, [anonymousMessageCount, user]);

  // Update model selection based on user authentication
  useEffect(() => {
    if (user) {
      setSelectedModel(getDefaultModel());
    } else {
      setSelectedModel(getDefaultAnonymousModel());
    }
  }, [user]);

  // Convex mutations and queries (only for authenticated users)
  const createChat = useMutation(api.messages.createChat);
  const saveMessage = useMutation(api.messages.saveMessage);
  const updateChatTitle = useMutation(api.messages.updateChatTitle);

  const chats = useQuery(
    api.messages.getChats,
    user ? { userId: user.id } : "skip"
  );
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

  // Debug logging
  useEffect(() => {
    console.log("🔍 Debug Info:", {
      user: user?.id,
      currentChatId,
      chatsCount: user ? chats?.length : anonymousChats.length,
      messagesCount: user
        ? currentChatMessages?.length
        : currentAnonymousChat?.messages.length,
      isCreatingChat,
      anonymousMessageCount,
      isAnonymousLimitReached,
    });
  }, [
    user,
    currentChatId,
    chats,
    currentChatMessages,
    isCreatingChat,
    anonymousChats,
    currentAnonymousChat,
    anonymousMessageCount,
    isAnonymousLimitReached,
  ]);

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

      if (
        user &&
        currentChatId &&
        typeof currentChatId === "string" &&
        currentChatId.length > 10
      ) {
        // Save AI response to Convex for authenticated users
        try {
          console.log("💾 Saving AI message to Convex...");
          const messageId = await saveMessage({
            chatId: currentChatId as Id<"chats">,
            userId: user.id,
            role: "assistant",
            body: message.content,
          });
          console.log("✅ AI message saved with ID:", messageId);
        } catch (error) {
          console.error("❌ Failed to save AI message:", error);
        }
      } else if (!user && currentAnonymousChat) {
        // Save AI response to localStorage for anonymous users
        const updatedMessages = [...currentAnonymousChat.messages, message];
        const updatedChat = {
          ...currentAnonymousChat,
          messages: updatedMessages,
        };
        setCurrentAnonymousChat(updatedChat);

        // Update localStorage
        const updatedChats = anonymousChats.map((chat) =>
          chat.id === currentAnonymousChat.id ? updatedChat : chat
        );
        setAnonymousChats(updatedChats);
        localStorage.setItem(ANONYMOUS_CHATS_KEY, JSON.stringify(updatedChats));

        // Increment count for assistant message
        setAnonymousMessageCount((c) => c + 1);

        console.log(
          "✅ AI message saved to localStorage and count incremented"
        );
      }
    },
  });

  // Helper function to save user message to localStorage for anonymous users
  const saveUserMessageToLocalStorage = (
    userMessage: Message,
    chatToUpdate: LocalStorageChat
  ) => {
    try {
      const updatedMessages = [...chatToUpdate.messages, userMessage];
      const updatedChat = { ...chatToUpdate, messages: updatedMessages };

      // Update chat title if this is the first message
      if (chatToUpdate.messages.length === 0) {
        const title =
          userMessage.content.slice(0, 30) +
          (userMessage.content.length > 30 ? "..." : "");
        updatedChat.title = title;
      }

      // Update current chat state first
      setCurrentAnonymousChat(updatedChat);

      // Get the most current chats from localStorage to avoid stale state
      const currentChatsFromStorage = localStorage.getItem(ANONYMOUS_CHATS_KEY);
      const currentChats: LocalStorageChat[] = currentChatsFromStorage
        ? JSON.parse(currentChatsFromStorage)
        : [];

      // Update the specific chat in the array
      const updatedChats = currentChats.map((chat) =>
        chat.id === chatToUpdate.id ? updatedChat : chat
      );

      // If chat doesn't exist, add it
      const chatExists = currentChats.some(
        (chat) => chat.id === chatToUpdate.id
      );
      if (!chatExists) {
        updatedChats.unshift(updatedChat);
      }

      // Save to localStorage
      localStorage.setItem(ANONYMOUS_CHATS_KEY, JSON.stringify(updatedChats));

      // Update the React state
      setAnonymousChats(updatedChats);

      // Increment message count for user message
      const newCount = anonymousMessageCount + 1;
      setAnonymousMessageCount(newCount);

      console.log("✅ User message saved to localStorage");
      return updatedChat;
    } catch (error) {
      console.error("❌ Failed to save user message to localStorage:", error);
      return chatToUpdate; // return unchanged chat
    }
  };

  // Create a new chat (handles both authenticated and anonymous users)
  const createNewChat = async () => {
    if (isCreatingChat) {
      console.warn("⚠️ Already creating a chat, skipping...");
      return null;
    }

    console.log("🆕 Creating new chat...");
    setIsCreatingChat(true);

    try {
      if (user) {
        // Authenticated user - use Convex
        const chatId = await createChat({
          userId: user.id,
          title: "New Chat",
        });

        console.log("✅ Chat created with ID:", chatId);
        setCurrentChatId(chatId);
        setMessages([]); // Clear current messages
        router.push(`/chat/${chatId}`);
        return chatId;
      } else {
        // Anonymous user - use localStorage
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
        setCurrentChatId(newChatId);
        setMessages([]);

        // Save to localStorage
        localStorage.setItem(ANONYMOUS_CHATS_KEY, JSON.stringify(updatedChats));
        localStorage.setItem(ANONYMOUS_CURRENT_CHAT_KEY, newChatId);

        console.log("✅ Anonymous chat created with ID:", newChatId);
        return newChatId;
      }
    } catch (error) {
      console.error("❌ Failed to create new chat:", error);
      return null;
    } finally {
      setIsCreatingChat(false);
    }
  };

  // Use the message input hook (modified for anonymous users)
  const messageInputHook = useMessageInput({
    user,
    currentChatId: user ? (currentChatId as Id<"chats">) : null,
    saveMessage,
    updateChatTitle,
    createNewChat: user
      ? (createNewChat as () => Promise<Id<"chats"> | null>)
      : async () => null,
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
        handleInputChangeWithAutoCreate: (
          _e: unknown,
          originalHandler: unknown
        ) => (originalHandler as (e: unknown) => void)(_e),
        onSubmit: () => {},
        handleKeyDown: () => {},
      };

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
        localStorage.setItem(ANONYMOUS_CURRENT_CHAT_KEY, chatId);
      }
    }
  };

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
    } else if (!user && currentAnonymousChat) {
      console.log(
        "📨 Loading anonymous messages:",
        currentAnonymousChat.messages.length
      );
      setMessages(currentAnonymousChat.messages);
    } else {
      setMessages([]);
    }
  }, [user, currentChatMessages, currentAnonymousChat, setMessages]);

  // Auto-select first chat if none selected and we're on the home page
  useEffect(() => {
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
        localStorage.setItem(ANONYMOUS_CURRENT_CHAT_KEY, firstChat.id);
      }
    }
  }, [user, chats, anonymousChats, currentChatId, pathname, router]);

  // Extract chat ID from URL if we're on a chat page (only for authenticated users)
  useEffect(() => {
    if (user && pathname.startsWith("/chat/")) {
      const chatIdFromUrl = pathname.split("/chat/")[1];
      if (chatIdFromUrl && chatIdFromUrl !== currentChatId) {
        console.log("🔗 Setting chat ID from URL:", chatIdFromUrl);
        setCurrentChatId(chatIdFromUrl as Id<"chats">);
      }
    }
  }, [user, pathname, currentChatId]);

  // Create enhanced input change handler
  const enhancedInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Check anonymous message limit
    if (!user && isAnonymousLimitReached) {
      return;
    }

    if (user) {
      // Create a synthetic input event for the useChat hook
      const syntheticEvent = {
        ...e,
        target: { value: e.target.value } as HTMLInputElement,
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleInputChangeWithAutoCreate(syntheticEvent, handleInputChange);
    } else {
      // For anonymous users, just handle input change
      const syntheticEvent = {
        ...e,
        target: { value: e.target.value } as HTMLInputElement,
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleInputChange(syntheticEvent);
    }
  };

  // Create enhanced submit handler
  const enhancedSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Check anonymous message limit (need 2 messages: user + AI)
    if (
      !user &&
      (isAnonymousLimitReached ||
        anonymousMessageCount + 1 > ANONYMOUS_MESSAGE_LIMIT)
    ) {
      setIsAnonymousLimitReached(true);
      return;
    }

    if (user) {
      onSubmit(e, input);
    } else {
      // For anonymous users, handle submission differently
      if (!input.trim()) return;

      // Ensure we have an anonymous chat
      let activeChat = currentAnonymousChat;
      if (!activeChat) {
        console.log(
          "🆕 No active anonymous chat, creating one for message submission"
        );
        const newChatId = await createNewChat();
        if (!newChatId) {
          console.error("❌ Failed to create anonymous chat for message");
          return;
        }
        // Re-fetch the active chat after creation
        const currentChatsFromStorage =
          localStorage.getItem(ANONYMOUS_CHATS_KEY);
        const currentChats: LocalStorageChat[] = currentChatsFromStorage
          ? JSON.parse(currentChatsFromStorage)
          : [];
        activeChat = currentChats.find((c) => c.id === newChatId) || null;
        if (!activeChat) {
          console.error("❌ Failed to find newly created chat");
          return;
        }
      }

      // Create user message
      const userMessage: Message = {
        id: `${Date.now()}_user`,
        role: "user",
        content: input,
        createdAt: new Date(),
      };

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

  // Handle question click from WelcomeScreen
  const handleQuestionClick = async (question: string) => {
    console.log("🤔 Question clicked:", question);

    // Check anonymous message limit
    if (
      !user &&
      (isAnonymousLimitReached ||
        anonymousMessageCount + 2 > ANONYMOUS_MESSAGE_LIMIT)
    ) {
      setIsAnonymousLimitReached(true);
      return;
    }

    if (user) {
      // Authenticated user logic (existing)
      let activeChatId = currentChatId;
      if (!activeChatId) {
        console.log("🆕 No active chat, creating one for question");
        activeChatId = await createNewChat();
        if (!activeChatId) {
          console.error("❌ Failed to create chat for question");
          return;
        }
      }

      try {
        // First, save the user message to Convex
        console.log("💾 Saving user question to Convex...");
        const messageId = await saveMessage({
          chatId: activeChatId as Id<"chats">,
          userId: user.id,
          role: "user",
          body: question,
        });
        console.log("✅ User question saved with ID:", messageId);

        // Update chat title if this is the first message
        const isFirstMessage = messages.length === 0;
        if (isFirstMessage) {
          const title =
            question.slice(0, 30) + (question.length > 30 ? "..." : "");
          try {
            console.log("🏷️ Updating chat title to:", title);
            await updateChatTitle({
              chatId: activeChatId as Id<"chats">,
              title,
            });
            console.log("✅ Chat title updated");
          } catch (error) {
            console.error("❌ Failed to update chat title:", error);
          }
        }

        // Then, use append to send the question and trigger AI response
        await append({
          role: "user",
          content: question,
        });
      } catch (error) {
        console.error("❌ Failed to process question:", error);
      }
    } else {
      // Anonymous user logic
      let activeChat = currentAnonymousChat;
      if (!activeChat) {
        console.log("🆕 No active anonymous chat, creating one for question");
        const newChatId = await createNewChat();
        if (!newChatId) {
          console.error("❌ Failed to create anonymous chat for question");
          return;
        }
        // Re-fetch the active chat after creation
        const currentChatsFromStorage =
          localStorage.getItem(ANONYMOUS_CHATS_KEY);
        const currentChats: LocalStorageChat[] = currentChatsFromStorage
          ? JSON.parse(currentChatsFromStorage)
          : [];
        activeChat = currentChats.find((c) => c.id === newChatId) || null;
        if (!activeChat) {
          console.error("❌ Failed to find newly created chat for question");
          return;
        }
      }

      // Create user message for the question
      const userMessage: Message = {
        id: `${Date.now()}_user`,
        role: "user",
        content: question,
        createdAt: new Date(),
      };

      // Save user message to localStorage immediately BEFORE calling append
      saveUserMessageToLocalStorage(userMessage, activeChat);

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

  // Prepare chat list for sidebar
  const sidebarChats = user
    ? chats?.map((chat) => ({ _id: chat._id, title: chat.title })) || []
    : anonymousChats.map((chat) => ({
        _id: chat.id,
        title: chat.title,
      }));

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
          src="https://datafa.st/widgets/684a2754569da665c6b838ca/realtime?mainTextSize=10&primaryColor=%233cda10&theme=light"
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
        currentChatId={currentChatId}
        isCreatingChat={isCreatingChat}
        onNewChat={handleNewChat}
        onChatSelect={handleChatSelect}
        isAnonymousLimitReached={user ? undefined : isAnonymousLimitReached}
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
        isAnonymousLimitReached={user ? false : isAnonymousLimitReached}
        anonymousMessageCount={user ? undefined : anonymousMessageCount}
        anonymousMessageLimit={user ? undefined : ANONYMOUS_MESSAGE_LIMIT}
      />
    </div>
  );
}
