"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { useChatManagement, useChatNavigation } from "../hooks";
import type { Message } from "@ai-sdk/react";

interface LocalStorageChat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

interface ChatLayoutProps {
  children: React.ReactNode;
  currentChatId?: string;
}

export function ChatLayout({ children, currentChatId }: ChatLayoutProps) {
  const params = useParams();
  const { user } = useUser();

  // Extract chatId from URL params, fallback to prop
  const chatId = currentChatId || (params?.chatId as string) || undefined;

  // Get authenticated user chats
  const chats = useQuery(
    api.messages.getChats,
    user ? { userId: user.id } : "skip"
  );

  const {
    anonymousMessageCount,
    anonymousAiMessageCount,
    isAnonymousLimitReached,
    ANONYMOUS_MESSAGE_LIMIT,
    setAnonymousAiMessageCount,
    setAnonymousChats,
    setCurrentAnonymousChat,
  } = useChatManagement(chatId);

  // Get anonymous chats from localStorage
  const [anonymousChats] = useState<LocalStorageChat[]>([]);

  // Use proper chat navigation
  const { handleChatSelect } = useChatNavigation({
    user,
    chats,
    anonymousChats,
    setMessages: () => {}, // We'll handle this in ChatUI
    setCurrentAnonymousChat,
  });

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar
          currentChatId={chatId}
          onChatSelect={handleChatSelect}
          isAnonymousLimitReached={isAnonymousLimitReached}
        />

        <main className="flex-1 flex flex-col">
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
