"use client";

import DataFastWidget from "./DataFastWidget";
import Sidebar from "./Sidebar";
import ChatContent from "./ChatContent";
import MessageInputOverlay from "./MessageInputOverlay";
import { useChatUI, ANONYMOUS_MESSAGE_LIMIT } from "../hooks/useChatUI";

export default function ChatUI() {
  const {
    user,
    messages,
    status,
    input,
    enhancedInputChange,
    handleKeyDown,
    enhancedSubmit,
    selectedModel,
    handleModelChange,
    bannerClosed,
    setBannerClosed,
    isAnonymousLimitReached,
    anonymousAiMessageCount,
    anonymousMessageCount,
    sidebarChats,
    handleQuestionClick,
    currentChatId,
    isCreatingChat,
    handleNewChat,
    handleChatSelect,
  } = useChatUI();

  return (
    <div className="flex h-screen w-full bg-gray-50 relative">
      <DataFastWidget />
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
        onQuestionClick={handleQuestionClick}
        isAnonymous={!user}
        anonymousMessageCount={user ? undefined : anonymousMessageCount}
        anonymousMessageLimit={user ? undefined : ANONYMOUS_MESSAGE_LIMIT}
      />
      <MessageInputOverlay
        input={input}
        onInputChange={enhancedInputChange}
        onKeyDown={handleKeyDown}
        onSubmit={enhancedSubmit}
        disabled={status !== "ready"}
        placeholder={
          !user ? "Type your message here... (Anonymous mode)" : "Type your message here..."
        }
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
        showBanner={!user && !bannerClosed}
        remaining={Math.max(0, ANONYMOUS_MESSAGE_LIMIT - anonymousAiMessageCount)}
        limitReached={isAnonymousLimitReached}
        onBannerClose={() => setBannerClosed(true)}
      />
    </div>
  );
}
