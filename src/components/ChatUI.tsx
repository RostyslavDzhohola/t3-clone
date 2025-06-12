"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  MessageSquare,
  Code,
  BookOpen,
  Lightbulb,
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
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MessageInput from "./MessageInput";
import { useMessageInput } from "../hooks";

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

  // Use the message input hook
  const { handleInputChangeWithAutoCreate, onSubmit, handleKeyDown } =
    useMessageInput({
      user,
      currentChatId,
      saveMessage,
      updateChatTitle,
      createNewChat,
      setCurrentChatId,
      messages,
      handleSubmit,
    });

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
  const enhancedInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleInputChangeWithAutoCreate(e, handleInputChange);
  };

  // Create enhanced submit handler
  const enhancedSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    onSubmit(e, input);
  };

  return (
    <div className="flex h-screen w-full bg-gray-50">
      {/* Sidebar */}
      <div className="flex flex-col w-60 border-r border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center justify-between mb-4">
          <a
            href="https://github.com/RostyslavDzhohola/t3-clone"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 font-bold text-lg hover:text-indigo-700 transition-colors"
            title="View T3 Chat Clone-a-thon on GitHub"
          >
            T3.1 Chat clone
          </a>
          <a
            href="https://github.com/RostyslavDzhohola/t3-clone"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-indigo-600 transition-colors"
            title="View on GitHub"
          >
            <svg
              className="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
          </a>
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
            <div className="space-y-6 max-w-3xl mx-auto pt-8">
              {messages.map((m: Message) => (
                <div key={m.id} className="w-full">
                  {m.role === "user" ? (
                    <div className="flex justify-end mb-4">
                      <div className="max-w-[70%] p-4 rounded-lg bg-indigo-600 text-white">
                        {m.content}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full p-4 text-gray-800">
                      <div className="prose prose-gray max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-strong:text-gray-800 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-[2px] prose-code:rounded prose-code:text-sm prose-pre:bg-gray-100 prose-pre:border prose-pre:border-gray-200 prose-blockquote:border-l-indigo-500 prose-blockquote:border-l-4 prose-blockquote:pl-4 prose-blockquote:italic prose-ul:list-disc prose-ol:list-decimal prose-li:marker:text-gray-500">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code: (props: React.ComponentProps<"code">) => {
                              const { className, children, ...rest } = props;
                              const isInline =
                                !className || !className.includes("language-");
                              return isInline ? (
                                <code
                                  className="bg-gray-100 px-1 py-[2px] rounded text-sm"
                                  {...rest}
                                >
                                  {children}
                                </code>
                              ) : (
                                <pre className="bg-gray-100 border border-gray-200 rounded-md p-4 overflow-x-auto">
                                  <code className={className} {...rest}>
                                    {children}
                                  </code>
                                </pre>
                              );
                            },
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {(status === "submitted" || status === "streaming") && (
                <div className="w-full p-4 text-gray-800">
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                    <span className="text-gray-500">AI is thinking...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Message Input Area */}
        {user && (
          <div className="absolute bottom-0 w-full p-4 flex justify-center bg-gray-50">
            <MessageInput
              input={input}
              onInputChange={enhancedInputChange}
              onKeyDown={handleKeyDown}
              onSubmit={enhancedSubmit}
              disabled={status !== "ready"}
              placeholder="Type your message here..."
            />
          </div>
        )}
      </div>
    </div>
  );
}
