"use client";

import React from "react";
import { useParams } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { useChatManagement } from "../hooks";

interface ChatLayoutProps {
  children: React.ReactNode;
  currentChatId?: string;
}

export function ChatLayout({ children, currentChatId }: ChatLayoutProps) {
  const params = useParams();

  // Extract chatId from URL params, fallback to prop
  const chatId = currentChatId || (params?.chatId as string) || undefined;

  const {
    anonymousMessageCount,
    anonymousAiMessageCount,
    isAnonymousLimitReached,
    ANONYMOUS_MESSAGE_LIMIT,
    setAnonymousAiMessageCount,
    setAnonymousChats,
    setCurrentAnonymousChat,
  } = useChatManagement(chatId);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar
          currentChatId={chatId}
          isAnonymousLimitReached={isAnonymousLimitReached}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          {React.isValidElement(children)
            ? React.cloneElement(children, {
                chatId,
                anonymousMessageCount,
                anonymousAiMessageCount,
                isAnonymousLimitReached,
                ANONYMOUS_MESSAGE_LIMIT,
                onAnonymousAiMessageUpdate: setAnonymousAiMessageCount,
                onAnonymousChatsUpdate: setAnonymousChats,
                onCurrentAnonymousChatUpdate: setCurrentAnonymousChat,
              } as Record<string, unknown>)
            : children}
        </main>
      </div>
    </SidebarProvider>
  );
}
