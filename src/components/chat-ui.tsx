"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useChat, type Message } from "@ai-sdk/react";
import { useChatLogic } from "@/hooks/use-chat-logic";
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

  // Set up useChat hook directly in the component
  const {
    messages,
    input,
    setInput,
    append,
    handleInputChange,
    handleSubmit,
    status,
    setMessages,
  } = useChat({
    api: "/api/chat",
    body: {
      model: selectedModel.id,
      chatId: user ? chatId : undefined,
      anonymous: !user,
      anonymousMessageCount: !user ? anonymousAiMessageCount : undefined,
    },
    initialMessages: user
      ? convertedMessages
      : currentAnonymousChat?.messages || [],
    onFinish: handleAiMessageFinish,
  });

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

  // Create the enhanced submit handler
  const enhancedSubmit = createEnhancedSubmit(
    handleSubmit,
    append,
    input,
    setInput,
    messages
  );

  return (
    <div className="relative flex flex-col h-full bg-gray-50">
      {/* Data Fast Widget */}
      <DataFastWidget />

      {/* Main Content Area - Now properly scrollable */}
      <div className="flex-1 overflow-y-auto">
        <ChatContent
          messages={messages}
          status={status}
          isAnonymous={!user}
          anonymousMessageCount={user ? undefined : anonymousMessageCount}
          anonymousMessageLimit={user ? undefined : ANONYMOUS_MESSAGE_LIMIT}
        />
      </div>

      {/* Floating Message Input Overlay */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center pt-4 z-40 pointer-events-none">
        <div className="w-full max-w-3xl pointer-events-auto px-4">
          <div className="backdrop-blur-xs border border-gray-200 rounded-t-2xl shadow-lg px-2 pt-2">
            <MessageInput
              input={input}
              onInputChange={handleInputChange}
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
