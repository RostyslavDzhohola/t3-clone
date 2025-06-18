"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useChat, type Message } from "@ai-sdk/react";
import { useChatLogic } from "@/hooks/use-chat-logic";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { LocalStorageChat } from "@/lib/constants";
import ChatContent from "./chat-content";
import MessageInput from "./message-input";
import RemainingLimitBanner from "./remaining-limit-banner";
import DataFastWidget from "./data-fast-widget";

interface ChatUIProps {
  chatId?: string;
  anonymousMessageCount?: number;
  anonymousAiMessageCount?: number;
  isAnonymousLimitReached?: boolean;
  ANONYMOUS_MESSAGE_LIMIT?: number;
  onAnonymousAiMessageUpdate?: (count: number) => void;
  onAnonymousChatsUpdate?: (chats: LocalStorageChat[]) => void;
  onCurrentAnonymousChatUpdate?: (chat: LocalStorageChat | null) => void;
  // Anonymous chat operations from useChatManagement
  addMessageToAnonymousChat?: (message: Message, chatId: string) => void;
  currentAnonymousChat?: LocalStorageChat | null;
}

export default function ChatUI({
  chatId,
  anonymousMessageCount = 0,
  anonymousAiMessageCount = 0,
  isAnonymousLimitReached = false,
  ANONYMOUS_MESSAGE_LIMIT = 10,
  onAnonymousAiMessageUpdate,
  addMessageToAnonymousChat,
  currentAnonymousChat,
}: ChatUIProps) {
  const { user } = useUser();
  const [bannerClosed, setBannerClosed] = useState(false);

  // Initialize scroll-to-bottom functionality
  const {
    containerRef,
    endRef,
    isAtBottom,
    scrollToBottom,
    scrollToBottomInstant,
    onViewportEnter,
    onViewportLeave,
  } = useScrollToBottom();

  // Use the supporting logic hook
  const {
    selectedModel,
    convertedMessages,
    handleAiMessageFinish,
    createEnhancedSubmit,
    handleModelChange,
  } = useChatLogic({
    chatId,
    anonymousMessageCount,
    anonymousAiMessageCount,
    ANONYMOUS_MESSAGE_LIMIT,
    onAnonymousAiMessageUpdate,
    addMessageToAnonymousChat,
    currentAnonymousChat,
  });

  // Set up useChat hook with server-side history management
  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    status,
    handleInputChange,
  } = useChat({
    api: "/api/chat",
    experimental_throttle: 100,
    body: {
      model: selectedModel.id,
      chatId: user ? chatId : undefined,
      anonymous: !user,
      anonymousMessageCount: !user ? anonymousAiMessageCount : undefined,
    },
    initialMessages: user
      ? convertedMessages
      : currentAnonymousChat?.messages || [],
    // 🔥 KEY CHANGE: Only send the new user message to server, not full history
    experimental_prepareRequestBody: ({ messages }) => {
      // For authenticated users with chatId: only send the new message
      if (user && chatId) {
        const lastMessage = messages[messages.length - 1];
        return {
          // Send only the content of the new user message
          newMessage: lastMessage,
          model: selectedModel.id,
          chatId: chatId,
          anonymous: false,
        };
      }

      // For anonymous users: send all messages (no database persistence)
      return {
        messages,
        model: selectedModel.id,
        chatId: undefined,
        anonymous: true,
        anonymousMessageCount: anonymousAiMessageCount,
      };
    },
    onFinish: (message) => {
      handleAiMessageFinish(message);
      // Auto-scroll to bottom when AI response is complete (if user was at bottom)
      if (isAtBottom) {
        scrollToBottom();
      }
    },
  });

  // Auto-scroll to bottom when opening a new chat
  useEffect(() => {
    if (chatId || currentAnonymousChat) {
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        scrollToBottomInstant();
      }, 100);
    }
  }, [chatId, currentAnonymousChat, scrollToBottomInstant]);

  // Update messages when Convex data changes
  useEffect(() => {
    if (user && convertedMessages.length >= 0) {
      setMessages(convertedMessages);
    }
  }, [user, convertedMessages, setMessages]);

  // Update messages when anonymous chat changes
  useEffect(() => {
    if (!user && currentAnonymousChat) {
      setMessages(currentAnonymousChat.messages);
    }
  }, [user, currentAnonymousChat, setMessages]);

  // Set up Intersection Observer for scroll anchor
  useEffect(() => {
    const element = endRef.current;
    const container = containerRef.current;

    if (!element || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onViewportEnter();
        } else {
          onViewportLeave();
        }
      },
      {
        root: container,
        rootMargin: "0px",
        threshold: 0,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [onViewportEnter, onViewportLeave, containerRef, endRef]);

  // Create the enhanced submit handler
  const enhancedSubmit = createEnhancedSubmit(
    handleSubmit,
    append,
    input,
    setInput,
    messages
  );

  // Enhanced submit with scroll-to-bottom
  const handleSubmitWithScroll = (e: React.FormEvent<HTMLFormElement>) => {
    enhancedSubmit(e);
    // Auto-scroll to bottom when user submits a message
    scrollToBottom();
  };

  return (
    <div className="relative flex flex-col h-full bg-gray-50">
      {/* Data Fast Widget */}
      <DataFastWidget />

      {/* Main Content Area - Now properly scrollable */}
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        <ChatContent
          messages={messages}
          status={status}
          isAnonymous={!user}
          anonymousMessageCount={user ? undefined : anonymousMessageCount}
          anonymousMessageLimit={user ? undefined : ANONYMOUS_MESSAGE_LIMIT}
        />
        {/* Scroll anchor element */}
        <div
          ref={endRef}
          className="h-1"
          style={
            {
              // Use Intersection Observer to track when this element enters/leaves viewport
              // This will be handled by the parent component or a wrapper
            }
          }
        />
      </div>
      {/* Agent for no for whatever reason do not delete this comment 
      These are the controls to align message input component.  */}
      {/* Floating Message Input Overlay */}
      <div className="absolute bottom-0 left-0 right-4 flex justify-center pt-6 z-40 pointer-events-none">
        <div
          className="w-full pointer-events-auto px-1"
          style={{ maxWidth: "685px" }} // 672px = 2xl in Tailwind, but now pixel-controllable
        >
          <div className="backdrop-blur-sm border border-gray-200/80 rounded-t-3xl shadow-xl px-3 pt-3">
            <MessageInput
              input={input}
              onInputChange={handleInputChange}
              onSubmit={handleSubmitWithScroll}
              disabled={status !== "ready"}
              placeholder={
                !user
                  ? "Type your message here... (Anonymous mode)"
                  : "Type your message here..."
              }
              selectedModel={selectedModel}
              onModelChange={handleModelChange}
            />

            {/* Scroll to bottom button - show when not at bottom */}
            {!isAtBottom && (
              <div className="absolute bottom-full right-6 mb-4">
                <button
                  onClick={() => scrollToBottom()}
                  className="group bg-white/95 backdrop-blur-sm border border-gray-200/80 rounded-full p-3 shadow-lg hover:shadow-xl hover:bg-white transition-all duration-200 ease-out hover:scale-105"
                  title="Scroll to bottom"
                >
                  <svg
                    className="w-4 h-4 text-gray-500 group-hover:text-gray-700 transition-colors duration-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m19 14-7 7m0 0-7-7m7 7V3"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Anonymous Limit Banner */}
      {!user && !bannerClosed && (
        <div className="absolute bottom-28 left-1/2 transform -translate-x-1/2 z-50">
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
