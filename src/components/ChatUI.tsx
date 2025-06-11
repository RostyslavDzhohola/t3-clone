"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  MessageSquare,
  Code,
  BookOpen,
  Lightbulb,
  Paperclip,
  Send,
  ChevronDown,
  Moon,
} from "lucide-react";
import { useChat, type Message } from "@ai-sdk/react";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useState } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { useRouter, usePathname } from "next/navigation";

export default function ChatUI() {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [currentChatId, setCurrentChatId] = useState<Id<"chats"> | null>(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

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

  // Auto-generate chat title from first user message
  const updateTitleFromFirstMessage = async (
    chatId: Id<"chats">,
    firstMessage: string
  ) => {
    const title =
      firstMessage.slice(0, 30) + (firstMessage.length > 30 ? "..." : "");
    try {
      console.log("🏷️ Updating chat title to:", title);
      await updateChatTitle({
        chatId,
        title,
      });
      console.log("✅ Chat title updated");
    } catch (error) {
      console.error("❌ Failed to update chat title:", error);
    }
  };

  // Auto-create chat when user starts typing (if no current chat)
  const handleInputChangeWithAutoCreate = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    handleInputChange(e);

    // If user starts typing and there's no current chat, create one
    if (!currentChatId && e.target.value.trim() && user && !isCreatingChat) {
      console.log("⌨️ Auto-creating chat because user started typing");
      const newChatId = await createNewChat();
      if (newChatId) {
        setCurrentChatId(newChatId);
      }
    }
  };

  // Handle form submission (both Enter key and Send button)
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("📤 Form submitted with input:", input.slice(0, 50) + "...");

    // Ensure we have a chat to send the message to
    let activeChatId = currentChatId;
    if (!activeChatId && user) {
      console.log("🆕 No active chat, creating one for message submission");
      activeChatId = await createNewChat();
      if (!activeChatId) {
        console.error("❌ Failed to create chat for message");
        return;
      }
    }

    // Save user message to Convex
    const currentInput = input;
    if (user && activeChatId && currentInput.trim()) {
      const isFirstMessage = messages.length === 0;

      try {
        console.log("💾 Saving user message to Convex...");
        const messageId = await saveMessage({
          chatId: activeChatId,
          userId: user.id,
          role: "user",
          body: currentInput,
        });
        console.log("✅ User message saved with ID:", messageId);

        // Update chat title if this is the first message
        if (isFirstMessage) {
          await updateTitleFromFirstMessage(activeChatId, currentInput);
        }
      } catch (error) {
        console.error("❌ Failed to save user message:", error);
      }
    }

    // Submit to AI chat
    handleSubmit(e);
  };

  // Handle Enter key specifically
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      console.log("⏎ Enter key pressed, submitting form");
      const form = e.currentTarget.closest("form");
      if (form) {
        const formEvent = new Event("submit", {
          bubbles: true,
          cancelable: true,
        });
        form.dispatchEvent(formEvent);
      }
    }
  };

  return (
    <div className="flex h-screen w-full bg-gray-50">
      {/* Sidebar */}
      <div className="flex flex-col w-60 border-r border-gray-200 bg-gray-50 p-4">
        <div className="text-indigo-600 font-bold text-xl mb-4">
          T3 clone hackathon
        </div>
        <Button
          onClick={handleNewChat}
          disabled={!user || isCreatingChat}
          className="w-full mb-4 bg-indigo-600 hover:bg-[#4338CA] text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4 mr-2" />
          {isCreatingChat ? "Creating..." : "New Chat"}
        </Button>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {chats?.map((chat) => (
            <Button
              key={chat._id}
              variant="ghost"
              onClick={() => handleChatSelect(chat._id)}
              className={`w-full justify-start text-left p-3 rounded-lg truncate ${
                currentChatId === chat._id
                  ? "bg-indigo-100 text-indigo-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <MessageSquare className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">{chat.title}</span>
            </Button>
          ))}
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search your threads..."
            className="pl-9 pr-3 py-2 rounded-lg bg-white border-gray-300"
          />
        </div>

        <div className="mt-auto">
          <SignedOut>
            <SignInButton mode="modal">
              <Button
                variant="ghost"
                className="w-full justify-start text-indigo-600 hover:bg-gray-100 px-3 py-2 rounded-lg"
              >
                <span className="mr-2">→</span>
                Login
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100">
              <UserButton afterSignOutUrl="/" />
              <span className="text-sm text-gray-700">Profile</span>
            </div>
          </SignedIn>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 relative">
        {/* Top Controls */}
        <div className="flex justify-end p-4 space-x-2">
          <Button variant="ghost" size="icon" className="w-8 h-8 text-gray-500">
            <Moon className="w-4 h-4" />
            <span className="sr-only">Toggle dark mode</span>
          </Button>
        </div>

        {/* Chat Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-32">
          {!user ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <h1 className="text-3xl font-bold mb-8 text-gray-700">
                Welcome!
              </h1>
              <p className="text-gray-600 mb-8">
                Please sign in to start chatting
              </p>
              <SignInButton mode="modal">
                <Button className="bg-indigo-600 hover:bg-[#4338CA] text-white">
                  Sign In
                </Button>
              </SignInButton>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <h1 className="text-3xl font-bold mb-8 text-gray-700">
                How can I help you?
              </h1>
              <div className="flex flex-wrap justify-center gap-3 mb-12">
                <Button
                  variant="outline"
                  className="flex items-center gap-2 px-6 py-2 rounded-full border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                >
                  <Lightbulb className="w-4 h-4" />
                  Create
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 px-6 py-2 rounded-full border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                >
                  <BookOpen className="w-4 h-4" />
                  Explore
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 px-6 py-2 rounded-full border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                >
                  <Code className="w-4 h-4" />
                  Code
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 px-6 py-2 rounded-full border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                >
                  <MessageSquare className="w-4 h-4" />
                  Learn
                </Button>
              </div>
              <div className="grid gap-3 w-full max-w-xl">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-lg text-gray-700 hover:bg-gray-100 px-4 py-3 rounded-lg"
                >
                  How does AI work?
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-lg text-gray-700 hover:bg-gray-100 px-4 py-3 rounded-lg"
                >
                  Are black holes real?
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-lg text-gray-700 hover:bg-gray-100 px-4 py-3 rounded-lg"
                >
                  How many Rs are in the word &quot;strawberry&quot;?
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-lg text-gray-700 hover:bg-gray-100 px-4 py-3 rounded-lg"
                >
                  What is the meaning of life?
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto pt-8">
              {messages.map((m: Message) => (
                <div
                  key={m.id}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] p-3 rounded-lg ${
                      m.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-gray-800"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {(status === "submitted" || status === "streaming") && (
                <div className="flex justify-start">
                  <div className="max-w-[70%] p-3 rounded-lg bg-white text-gray-800">
                    AI is typing...
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Message Input Area */}
        {user && (
          <div className="absolute bottom-0 w-full p-4 flex justify-center">
            <form onSubmit={onSubmit} className="w-full max-w-3xl space-y-3">
              {/* Input field */}
              <div className="relative">
                <Input
                  value={input}
                  onChange={handleInputChangeWithAutoCreate}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message here..."
                  className="w-full py-6 px-4 rounded-xl border-gray-300 bg-white focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-50 text-base shadow-sm"
                  disabled={status !== "ready"}
                />
              </div>

              {/* Controls row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="flex items-center gap-1 text-gray-700 hover:bg-gray-100 px-3 py-1 rounded-md text-sm"
                      >
                        Gemini 2.5 Flash
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem>Gemini 2.5 Flash</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-1 text-gray-400 cursor-not-allowed px-3 py-1 rounded-md opacity-50"
                    disabled
                  >
                    <Search className="w-4 h-4" />
                    Search
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-1 text-gray-400 cursor-not-allowed px-3 py-1 rounded-md text-sm opacity-50"
                    disabled
                  >
                    <Paperclip className="w-4 h-4" />
                    Attach
                  </Button>
                </div>

                <Button
                  type="submit"
                  size="icon"
                  className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-[#4338CA] text-white"
                  disabled={status !== "ready"}
                >
                  <Send className="w-5 h-5" />
                  <span className="sr-only">Send message</span>
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
