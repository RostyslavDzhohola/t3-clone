"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useChat, type Message } from "@ai-sdk/react";
import { useChatLogic } from "@/hooks/use-chat-logic";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { LocalStorageChat } from "@/lib/constants";
import ChatContent from "./chat-content";
import MessageInput from "./message-input";
// import RemainingLimitBanner from "./remaining-limit-banner";

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
  // isAnonymousLimitReached = false,
  ANONYMOUS_MESSAGE_LIMIT = 10,
  onAnonymousAiMessageUpdate,
  addMessageToAnonymousChat,
  currentAnonymousChat,
}: ChatUIProps) {
  const { user } = useUser();
  // const [bannerClosed, setBannerClosed] = useState(false);
  const [isContentReady, setIsContentReady] = useState(false);
  const [currentLoadingChatId, setCurrentLoadingChatId] = useState<
    string | null
  >(null);

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

  // Set up useChat hook with server-side history management and resumable streams
  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    status,
    handleInputChange,
    experimental_resume,
    data,
  } = useChat({
    api: "/api/chat",
    // 🔥 RESUMABLE STREAMS: Provide chat ID to enable stream resumption
    id: user && chatId ? chatId : undefined,
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
    experimental_prepareRequestBody: ({
      messages,
    }: {
      messages: Message[];
    }) => {
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
    onFinish: (message: Message) => {
      handleAiMessageFinish(message);
      // No automatic scrolling - stay where you are
    },
  });

  // 🔥 RESUMABLE STREAMS: Auto-resume streams for authenticated users
  useAutoResume({
    autoResume: Boolean(user && chatId),
    initialMessages: user
      ? convertedMessages
      : currentAnonymousChat?.messages || [],
    experimental_resume,
    data,
    setMessages,
  });

  // Handle chat switching - set loading state
  useEffect(() => {
    const newChatId = user ? chatId : currentAnonymousChat?.id;
    if (newChatId && newChatId !== currentLoadingChatId) {
      setIsContentReady(false);
      setCurrentLoadingChatId(newChatId);
    }
    // Handle case when no chat is selected (show content immediately)
    if (!newChatId && currentLoadingChatId) {
      setIsContentReady(true);
      setCurrentLoadingChatId(null);
    }
  }, [chatId, currentAnonymousChat, user, currentLoadingChatId]);

  // Helper function to wait for content to be rendered and scrolled
  const waitForContentAndReveal = useCallback(
    (messageCount = 0) => {
      // Dynamic delay based on message count (more messages = longer delay)
      const baseDelay = 150;
      const perMessageDelay =
        messageCount > 50 ? 20 : messageCount > 20 ? 15 : 5; // Graduated delay for large chats
      const maxDelay = messageCount > 50 ? 1000 : 750; // Higher max delay for very large chats
      const initialDelay = Math.min(
        baseDelay + messageCount * perMessageDelay,
        maxDelay
      );

      // First, wait for DOM to render the messages
      setTimeout(() => {
        // Then scroll to bottom
        scrollToBottomInstant();

        // Wait for scroll to complete and check if content is actually rendered
        const checkContentReady = (attempts = 0) => {
          const container = containerRef.current;
          const endElement = endRef.current;

          if (container && endElement && attempts < 20) {
            // Max 20 attempts (1 second)
            // Check if we have meaningful content height and scroll is positioned
            const hasContent = container.scrollHeight > 100;
            const isScrolledToBottom =
              Math.abs(
                container.scrollTop +
                  container.clientHeight -
                  container.scrollHeight
              ) < 50; // Within 50px of bottom

            if (hasContent && isScrolledToBottom) {
              // Content is ready and properly positioned, reveal it
              setIsContentReady(true);
            } else {
              // Still waiting for content or scroll positioning, check again
              setTimeout(() => checkContentReady(attempts + 1), 50);
            }
          } else if (attempts >= 20) {
            // Fallback: reveal content even if checks failed
            console.warn(
              "Content readiness checks timed out, revealing content"
            );
            setIsContentReady(true);
          } else {
            // Elements not ready, try again
            setTimeout(() => checkContentReady(attempts + 1), 50);
          }
        };

        // Start checking for content readiness after scroll completes
        setTimeout(() => checkContentReady(), 150);
      }, initialDelay);
    },
    [scrollToBottomInstant, containerRef, endRef]
  );

  // Update messages when Convex data changes
  useEffect(() => {
    if (user && convertedMessages.length >= 0) {
      setMessages(convertedMessages);
      // Wait for content to be properly loaded and positioned
      waitForContentAndReveal(convertedMessages.length);
    }
  }, [user, convertedMessages, setMessages, waitForContentAndReveal]);

  // Update messages when anonymous chat changes
  useEffect(() => {
    if (!user && currentAnonymousChat) {
      setMessages(currentAnonymousChat.messages);
      // Wait for content to be properly loaded and positioned
      waitForContentAndReveal(currentAnonymousChat.messages.length);
    }
  }, [user, currentAnonymousChat, setMessages, waitForContentAndReveal]);

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
      {/* Loading Overlay - Just hide content behind empty background */}
      {!isContentReady && <div className="absolute inset-0 bg-gray-50 z-30" />}

      {/* Main Content Area - Now properly scrollable */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-y-auto transition-opacity duration-300 ${
          isContentReady ? "opacity-100" : "opacity-0"
        }`}
      >
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
      {/* Floating Message Input Overlay - Always visible, independent of content loading */}
      <div className="absolute bottom-0 left-1 right-5 flex justify-center pt-6 z-40 pointer-events-none">
        <div
          className="w-full pointer-events-auto px-1"
          style={{ maxWidth: "685px" }} // 672px = 2xl in Tailwind, but now pixel-controllable
        >
          <div className="backdrop-blur-sm border border-gray-200/80 rounded-t-3xl shadow-xl px-3 pt-3">
            <MessageInput
              input={input}
              onInputChange={handleInputChange}
              onSubmit={handleSubmitWithScroll}
              disabled={status === "submitted"}
              placeholder={
                !user
                  ? "Type your message here... (Anonymous mode)"
                  : "Type your message here..."
              }
              selectedModel={selectedModel}
              onModelChange={handleModelChange}
            />

            {/* Scroll to bottom button - show when not at bottom and content is ready */}
            {!isAtBottom && isContentReady && (
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
      {/* {!user && !bannerClosed && (
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
      )} */}
    </div>
  );
}
