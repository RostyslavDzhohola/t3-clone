"use client";

import React, { useState } from "react";
import { type Message } from "@ai-sdk/react";
import { useUser } from "@clerk/nextjs";
import { useChatLogic } from "@/hooks/use-chat-logic";
import ChatContent from "./chat-content";
import MessageInput from "./message-input";
import RemainingLimitBanner from "./remaining-limit-banner";
import DataFastWidget from "./data-fast-widget";

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
  const [bannerClosed, setBannerClosed] = useState(false);

  // Use the extracted chat logic hook
  const {
    selectedModel,
    messages,
    input,
    status,
    handleInputChange,
    enhancedSubmit,
    handleModelChange,
  } = useChatLogic({
    chatId,
    anonymousMessageCount,
    anonymousAiMessageCount,
    ANONYMOUS_MESSAGE_LIMIT,
    onAnonymousAiMessageUpdate,
    onAnonymousChatsUpdate,
    onCurrentAnonymousChatUpdate,
  });

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
