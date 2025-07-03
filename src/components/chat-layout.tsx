"use client";

import React from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { useChatManagement, useChatNavigation } from "../hooks";

interface ChatLayoutProps {
  children: React.ReactNode;
}

export function ChatLayout({ children }: ChatLayoutProps) {
  const { user } = useUser();

  // Get authenticated user chats
  const chats = useQuery(
    api.messages.getChats,
    user ? { userId: user.id } : "skip"
  );

  const { currentChatId } = useChatManagement();

  // Use proper chat navigation
  const { handleChatSelect } = useChatNavigation({
    user,
    chats,
  });

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar
          currentChatId={currentChatId}
          onChatSelect={handleChatSelect}
        />

        <main className="flex-1 flex flex-col">
          {React.isValidElement(children)
            ? React.cloneElement(children, {
                chatId: currentChatId,
              } as Record<string, unknown>)
            : children}
        </main>
      </div>
    </SidebarProvider>
  );
}
