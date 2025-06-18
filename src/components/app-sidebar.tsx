"use client";

import React, { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { SidebarUserNav } from "./sidebar-user-nav";
import { SidebarSearch } from "./sidebar-search";
import { SidebarHistory } from "./sidebar-history";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  getObjectFromStorage,
  setObjectInStorage,
  generateAnonymousChatId,
} from "@/lib/chatHelpers";
import { ANONYMOUS_STORAGE_KEYS, LocalStorageChat } from "@/lib/constants";

interface AppSidebarProps {
  currentChatId?: string;
  onChatSelect?: (chatId: string) => void;
  isAnonymousLimitReached?: boolean;
}

export function AppSidebar({
  currentChatId,
  onChatSelect,
  isAnonymousLimitReached,
}: AppSidebarProps) {
  const { user } = useUser();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);

  // Convex mutations for authenticated users
  const createChat = useMutation(api.messages.createChat);

  // Anonymous chats from localStorage
  const [anonymousChats, setAnonymousChats] = useState<LocalStorageChat[]>(
    () => {
      if (typeof window === "undefined") return [];
      return getObjectFromStorage<LocalStorageChat[]>(
        ANONYMOUS_STORAGE_KEYS.CHATS,
        []
      );
    }
  );

  // Create new chat
  const handleNewChat = async () => {
    if (isCreatingChat) return;
    setIsCreatingChat(true);

    try {
      if (user) {
        // Authenticated user - create in Convex
        const chatId = await createChat({
          userId: user.id,
          title: "New Chat",
        });
        router.push(`/chat/${chatId}`);
      } else {
        // Anonymous user - create in localStorage
        const newChatId = generateAnonymousChatId();
        const newChat: LocalStorageChat = {
          id: newChatId,
          title: "New Chat",
          messages: [],
          createdAt: Date.now(),
        };

        const updatedChats = [newChat, ...anonymousChats];
        setAnonymousChats(updatedChats);
        setObjectInStorage(ANONYMOUS_STORAGE_KEYS.CHATS, updatedChats);
        localStorage.setItem(ANONYMOUS_STORAGE_KEYS.CURRENT_CHAT, newChatId);

        router.push(`/chat/${newChatId}`);
      }
    } catch (error) {
      console.error("Failed to create chat:", error);
      toast.error("Failed to create new chat");
    } finally {
      setIsCreatingChat(false);
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-between px-2 py-1">
          <a
            href="https://github.com/RostyslavDzhohola/t3-clone"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sidebar-foreground font-bold text-lg hover:text-sidebar-accent-foreground transition-colors"
            title="View T3 Chat Cloneathon on GitHub"
          >
            general magic
          </a>
          <a
            href="https://github.com/RostyslavDzhohola/t3-clone"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sidebar-muted-foreground hover:text-sidebar-foreground transition-colors"
            title="View on GitHub"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
          </a>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex flex-col">
        {/* Fixed top section - New Chat Button and Search */}
        <div className="flex-shrink-0 px-2">
          {/* New Chat Button */}
          <Button
            onClick={handleNewChat}
            disabled={(!user && isAnonymousLimitReached) || isCreatingChat}
            className="w-full mb-3 bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            {isCreatingChat ? "Creating..." : "New Chat"}
          </Button>

          {/* Search */}
          <SidebarSearch
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        </div>

        {/* Scrollable chat history section */}
        <SidebarGroup className="flex-1 overflow-y-auto">
          <SidebarHistory
            currentChatId={currentChatId}
            onChatSelect={onChatSelect}
            searchTerm={searchTerm}
            anonymousChats={anonymousChats}
            setAnonymousChats={setAnonymousChats}
            deletingChatId={deletingChatId}
            setDeletingChatId={setDeletingChatId}
          />
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarUserNav />
      </SidebarFooter>
    </Sidebar>
  );
}
