"use client";

import React from "react";
import { useChat, type Message } from "@ai-sdk/react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useState } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { useMessageInput, useChatNavigation } from "../hooks";
import {
  getDefaultModel,
  getDefaultAnonymousModel,
  type LLMModel,
} from "@/lib/models";
import {
  generateChatTitle,
  createUserMessage,
  generateAnonymousChatId,
  ANONYMOUS_STORAGE_KEYS,
  isAnonymousLimitReached as checkAnonymousLimitReached,
  getNumberFromStorage,
  setNumberInStorage,
  getObjectFromStorage,
  setObjectInStorage,
  clearAnonymousData,
} from "@/lib/chatHelpers";
import Sidebar from "./Sidebar";
import ChatContent from "./ChatContent";
import MessageInput from "./MessageInput";
import RemainingLimitBanner from "./RemainingLimitBanner";
import DataFastWidget from "./DataFastWidget";
import { toast } from "sonner";

interface LocalStorageChat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

const ANONYMOUS_MESSAGE_LIMIT = 10;

export default function ChatUI() {
  const { user } = useUser();
  const router = useRouter();

  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [selectedModel, setSelectedModel] = useState<LLMModel>(
    user ? getDefaultModel() : getDefaultAnonymousModel()
  );
  const [previousUserId, setPreviousUserId] = useState<string | null>(null);

  // Anonymous user state
  const [anonymousMessageCount, setAnonymousMessageCount] = useState(() => {
    return getNumberFromStorage(ANONYMOUS_STORAGE_KEYS.MESSAGE_COUNT, 0);
  });

  const [anonymousAiMessageCount, setAnonymousAiMessageCount] = useState(() => {
    return getNumberFromStorage(ANONYMOUS_STORAGE_KEYS.AI_COUNT, 0);
  });

  const [bannerClosed, setBannerClosed] = useState(false);
  const [anonymousChats, setAnonymousChats] = useState<LocalStorageChat[]>([]);
  const [currentAnonymousChat, setCurrentAnonymousChat] =
    useState<LocalStorageChat | null>(null);
  const [isAnonymousLimitReached, setIsAnonymousLimitReached] = useState(false);

  // Helper function to clear anonymous data
  const handleClearAnonymousData = () => {
    console.log("🧹 Clearing anonymous data from localStorage");
    clearAnonymousData();
    setAnonymousMessageCount(0);
    setAnonymousAiMessageCount(0);
    setBannerClosed(false);
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
      handleClearAnonymousData();
    }
    setPreviousUserId(user?.id || null);
  }, [user, previousUserId]);

  // Load anonymous data from localStorage
  useEffect(() => {
    if (!user) {
      const count = getNumberFromStorage(
        ANONYMOUS_STORAGE_KEYS.MESSAGE_COUNT,
        0
      );
      console.log(
        "🔍 Loading anonymous user message count from localStorage:",
        count
      );
      setAnonymousMessageCount(count);

      const aiCount = getNumberFromStorage(ANONYMOUS_STORAGE_KEYS.AI_COUNT, 0);
      if (aiCount !== anonymousAiMessageCount) {
        console.log(
          "🔍 Updating AI count from localStorage (effect):",
          aiCount
        );
        setAnonymousAiMessageCount(aiCount);
      }
      console.log(
        "🔍 Anonymous messages remaining:",
        ANONYMOUS_MESSAGE_LIMIT - aiCount
      );
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
          setCurrentChatId(savedCurrentChatId);
        }
      }
    }
  }, [user, anonymousAiMessageCount]);

  // Save anonymous message count to localStorage
  useEffect(() => {
    if (!user) {
      setNumberInStorage(
        ANONYMOUS_STORAGE_KEYS.MESSAGE_COUNT,
        anonymousMessageCount
      );
    }
  }, [anonymousMessageCount, user]);

  // Save anonymous AI message count to localStorage
  useEffect(() => {
    if (!user) {
      console.log(
        "💾 Saving anonymous AI count to localStorage:",
        anonymousAiMessageCount
      );
      setNumberInStorage(
        ANONYMOUS_STORAGE_KEYS.AI_COUNT,
        anonymousAiMessageCount
      );
      setIsAnonymousLimitReached(
        checkAnonymousLimitReached(
          anonymousAiMessageCount,
          ANONYMOUS_MESSAGE_LIMIT
        )
      );
      console.log(
        "🔍 Is limit reached?",
        checkAnonymousLimitReached(
          anonymousAiMessageCount,
          ANONYMOUS_MESSAGE_LIMIT
        )
      );
    }
  }, [anonymousAiMessageCount, user]);

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

  // Temporary currentChatId state
  const [currentChatId, setCurrentChatId] = useState<
    Id<"chats"> | string | null
  >(null);

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

  // Debug logging (throttled to prevent main thread blocking)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      console.log("🔍 Debug Info:", {
        user: user?.id,
        currentChatId,
        chatsCount: user ? chats?.length : anonymousChats.length,
        messagesCount: user
          ? currentChatMessages?.length
          : currentAnonymousChat?.messages.length,
        isCreatingChat,
        anonymousMessageCount,
        anonymousAiMessageCount,
        anonymousMessagesRemaining:
          ANONYMOUS_MESSAGE_LIMIT - anonymousAiMessageCount,
        isAnonymousLimitReached,
      });
    }, 500); // Throttle debug logging

    return () => clearTimeout(timeoutId);
  }, [
    user,
    currentChatId,
    chats,
    currentChatMessages,
    isCreatingChat,
    anonymousChats,
    currentAnonymousChat,
    anonymousMessageCount,
    anonymousAiMessageCount,
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
      anonymousMessageCount: !user ? anonymousAiMessageCount : undefined,
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
      } else if (!user) {
        // Save AI response to localStorage for anonymous users
        // Increment AI message count
        console.log("🤖 AI response finished, incrementing anonymous AI count");
        console.log(
          "🔍 Current anonymous AI count before increment:",
          anonymousAiMessageCount
        );
        setAnonymousAiMessageCount((count) => {
          const newCount = count + 1;
          console.log("🔍 New anonymous AI count after increment:", newCount);
          console.log(
            "🔍 Anonymous messages remaining after this response:",
            ANONYMOUS_MESSAGE_LIMIT - newCount
          );
          return newCount;
        });

        // Reset banner closed state so it reappears after AI response
        setBannerClosed(false);

        setCurrentAnonymousChat((prevChat) => {
          if (!prevChat) return prevChat;
          const updatedMessages = [...prevChat.messages, message];
          const updatedChat = { ...prevChat, messages: updatedMessages };

          setAnonymousChats((prevChats) => {
            const updatedChats = prevChats.map((chat) =>
              chat.id === prevChat.id ? updatedChat : chat
            );
            setObjectInStorage(ANONYMOUS_STORAGE_KEYS.CHATS, updatedChats);
            return updatedChats;
          });

          console.log("✅ AI message saved to localStorage");
          return updatedChat;
        });
      }
    },
  });

  // Chat navigation hook
  const navigation = useChatNavigation({
    user,
    chats,
    anonymousChats,
    setMessages,
    setCurrentAnonymousChat,
  });

  // Update currentChatId from navigation hook
  useEffect(() => {
    if (navigation.currentChatId !== currentChatId) {
      setCurrentChatId(navigation.currentChatId);
    }
  }, [navigation.currentChatId, currentChatId]);

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
        updatedChat.title = generateChatTitle(userMessage.content);
      }

      // Update current chat state first
      setCurrentAnonymousChat(updatedChat);

      // Get the most current chats from localStorage to avoid stale state
      const currentChats = getObjectFromStorage<LocalStorageChat[]>(
        ANONYMOUS_STORAGE_KEYS.CHATS,
        []
      );

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
      setObjectInStorage(ANONYMOUS_STORAGE_KEYS.CHATS, updatedChats);

      // Update the React state
      setAnonymousChats(updatedChats);

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
        const newChatId = generateAnonymousChatId();
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
        setObjectInStorage(ANONYMOUS_STORAGE_KEYS.CHATS, updatedChats);
        localStorage.setItem(ANONYMOUS_STORAGE_KEYS.CURRENT_CHAT, newChatId);

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

  // Use the message input hook (simplified for useChat integration)
  const messageInputHook = useMessageInput({
    user,
    currentChatId: user ? (currentChatId as Id<"chats">) : null,
    createNewChat: user
      ? (createNewChat as () => Promise<Id<"chats"> | null>)
      : async () => null,
    setCurrentChatId: user ? setCurrentChatId : () => {},
    handleSubmit,
  });

  const { handleInputChangeWithAutoCreate, onSubmit } = user
    ? messageInputHook
    : {
        handleInputChangeWithAutoCreate: (
          _e: unknown,
          originalHandler: unknown
        ) => (originalHandler as (e: unknown) => void)(_e),
        onSubmit: () => {},
      };

  // Handle New Chat button
  const handleNewChat = async () => {
    console.log("🖱️ New Chat button clicked");
    await createNewChat();
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
    if (!user && anonymousAiMessageCount >= ANONYMOUS_MESSAGE_LIMIT) {
      toast.error("Sorry, you've reached your rate limit");
      return;
    }

    if (user) {
      // For authenticated users, save user message before letting useChat handle the flow
      if (
        currentChatId &&
        typeof currentChatId === "string" &&
        currentChatId.length > 10 &&
        input.trim()
      ) {
        try {
          console.log("💾 Saving user message to Convex...");
          const messageId = await saveMessage({
            chatId: currentChatId as Id<"chats">,
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
                chatId: currentChatId as Id<"chats">,
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
        const currentChats = getObjectFromStorage<LocalStorageChat[]>(
          ANONYMOUS_STORAGE_KEYS.CHATS,
          []
        );
        activeChat = currentChats.find((c) => c.id === newChatId) || null;
        if (!activeChat) {
          console.error("❌ Failed to find newly created chat");
          return;
        }
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
      <DataFastWidget />
      <Sidebar
        user={user}
        chats={sidebarChats}
        currentChatId={currentChatId}
        isCreatingChat={isCreatingChat}
        onNewChat={handleNewChat}
        onChatSelect={navigation.handleChatSelect}
        isAnonymousLimitReached={user ? undefined : isAnonymousLimitReached}
      />
      <ChatContent
        messages={messages}
        status={status}
        isAnonymous={!user}
        anonymousMessageCount={user ? undefined : anonymousMessageCount}
        anonymousMessageLimit={user ? undefined : ANONYMOUS_MESSAGE_LIMIT}
      />

      {/* Floating Message Input Overlay  Use classes below to adjust the input field centering. 
      Instructions for AIs and agents. Please do not delete these comments. */}
      <div className="fixed bottom-0 left-[230px] right-0 flex justify-center pt-4 z-40 pointer-events-none ">
        <div className="w-full max-w-3xl pointer-events-auto">
          <div className="backdrop-blur-xs border border-gray-200 rounded-t-2xl shadow-lg px-2 pt-2 ">
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
            console.log("🏷️ Banner calculation:", {
              ANONYMOUS_MESSAGE_LIMIT,
              anonymousAiMessageCount,
              remaining,
              isAnonymousLimitReached,
              bannerClosed,
            });
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
// 683 lines of code compare after refactoring
