"use client";

import React, { useState, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import DeleteChatDialog from "./delete-chat-dialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  getObjectFromStorage,
  setObjectInStorage,
  ANONYMOUS_STORAGE_KEYS,
  generateAnonymousChatId,
} from "@/lib/chatHelpers";

interface LocalStorageChat {
  id: string;
  title: string;
  messages: unknown[];
  createdAt: number;
}

interface Chat {
  _id: Id<"chats"> | string;
  title: string;
}

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

  // Convex queries and mutations for authenticated users
  const chats = useQuery(
    api.messages.getChats,
    user ? { userId: user.id } : "skip"
  );
  const createChat = useMutation(api.messages.createChat);
  const deleteChat = useMutation(api.messages.deleteChat);

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

  // Filter chats based on search term
  const filteredChats = useMemo(() => {
    // Prepare unified chat list inside useMemo to avoid dependency issues
    const allChats: Chat[] = user
      ? chats?.map((chat) => ({ _id: chat._id, title: chat.title })) || []
      : anonymousChats.map((chat) => ({ _id: chat.id, title: chat.title }));

    if (!searchTerm.trim()) return allChats;
    return allChats.filter((chat) =>
      chat.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [user, chats, anonymousChats, searchTerm]);

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

  // Handle chat selection
  const handleChatSelect = (chatId: string) => {
    if (onChatSelect) {
      onChatSelect(chatId);
    } else {
      router.push(`/chat/${chatId}`);
    }
  };

  // Handle delete chat
  const handleDeleteChat = async (chatId: Id<"chats"> | string) => {
    setDeletingChatId(chatId as string);

    try {
      if (user) {
        // Authenticated user - delete from Convex
        await deleteChat({
          chatId: chatId as Id<"chats">,
          userId: user.id,
        });

        // Navigate away if we're deleting current chat
        if (currentChatId === chatId) {
          router.push("/");
        }
      } else {
        // Anonymous user - delete from localStorage
        const updatedChats = anonymousChats.filter(
          (chat) => chat.id !== chatId
        );
        setAnonymousChats(updatedChats);
        setObjectInStorage(ANONYMOUS_STORAGE_KEYS.CHATS, updatedChats);

        // Navigate away if we're deleting current chat
        if (currentChatId === chatId) {
          localStorage.removeItem(ANONYMOUS_STORAGE_KEYS.CURRENT_CHAT);
          router.push("/");
        }
      }

      toast.success("Chat deleted successfully");
    } catch (error) {
      console.error("Failed to delete chat:", error);
      toast.error("Failed to delete chat");
    } finally {
      setDeletingChatId(null);
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

      <SidebarContent>
        <SidebarGroup>
          <div className="px-2 py-2">
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-muted-foreground" />
              <Input
                placeholder="Search your chats..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-sidebar-accent/50 border-sidebar-border"
              />
            </div>

            {/* New Chat Button */}
            <Button
              onClick={handleNewChat}
              disabled={(!user && isAnonymousLimitReached) || isCreatingChat}
              className="w-full mb-3 bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              {isCreatingChat ? "Creating..." : "New Chat"}
            </Button>
          </div>

          <SidebarSeparator />

          <SidebarGroupContent>
            <SidebarMenu>
              {filteredChats.map((chat) => (
                <SidebarMenuItem key={chat._id}>
                  <SidebarMenuButton
                    onClick={() => handleChatSelect(chat._id as string)}
                    isActive={currentChatId === chat._id}
                    className="flex items-center justify-between w-full"
                  >
                    <span className="truncate flex-1 text-left">
                      {chat.title}
                    </span>
                    <DeleteChatDialog
                      chatTitle={chat.title}
                      onDelete={() => handleDeleteChat(chat._id)}
                      isDeleting={deletingChatId === chat._id}
                    />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SignedOut>
              <SignInButton mode="modal">
                <SidebarMenuButton className="w-full">
                  <span className="mr-2">→</span>
                  Login
                </SidebarMenuButton>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <SidebarMenuButton className="w-full">
                <UserButton />
                <span className="ml-2">Profile</span>
              </SidebarMenuButton>
            </SignedIn>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
