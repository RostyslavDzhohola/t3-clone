"use client";

import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { SidebarMenu, SidebarGroupContent } from "@/components/ui/sidebar";
import { SidebarHistoryItem } from "./sidebar-history-item";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setObjectInStorage, ANONYMOUS_STORAGE_KEYS } from "@/lib/chatHelpers";

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

interface SidebarHistoryProps {
  currentChatId?: string;
  onChatSelect?: (chatId: string) => void;
  searchTerm: string;
  anonymousChats: LocalStorageChat[];
  setAnonymousChats: (chats: LocalStorageChat[]) => void;
  deletingChatId: string | null;
  setDeletingChatId: (id: string | null) => void;
}

export function SidebarHistory({
  currentChatId,
  onChatSelect,
  searchTerm,
  anonymousChats,
  setAnonymousChats,
  deletingChatId,
  setDeletingChatId,
}: SidebarHistoryProps) {
  const { user } = useUser();
  const router = useRouter();

  // Convex queries and mutations for authenticated users
  const chats = useQuery(
    api.messages.getChats,
    user ? { userId: user.id } : "skip"
  );
  const deleteChat = useMutation(api.messages.deleteChat);

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
    <SidebarGroupContent>
      <SidebarMenu>
        {filteredChats.map((chat) => (
          <SidebarHistoryItem
            key={chat._id}
            chat={chat}
            isActive={currentChatId === chat._id}
            onChatSelect={handleChatSelect}
            onDelete={handleDeleteChat}
            isDeleting={deletingChatId === chat._id}
          />
        ))}
      </SidebarMenu>
    </SidebarGroupContent>
  );
}
