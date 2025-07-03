"use client";

import React from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useChatNavigation } from "@/hooks";

interface ChatLayoutPageProps {
  children: React.ReactNode;
}

export default function ChatLayoutPage({ children }: ChatLayoutPageProps) {
  const { user } = useUser();

  // Get authenticated user chats
  const chats = useQuery(
    api.messages.getChats,
    user ? { userId: user.id } : "skip"
  );

  // Use proper chat navigation
  const { currentChatId, handleChatSelect } = useChatNavigation({
    user,
    chats,
  });

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar
          currentChatId={currentChatId || undefined}
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
