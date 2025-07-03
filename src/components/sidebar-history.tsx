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

interface Chat {
  _id: Id<"chats"> | string;
  title: string;
  lastActivity: number; // Timestamp for grouping
}

interface ChatGroup {
  label: string;
  chats: Chat[];
}

interface SidebarHistoryProps {
  currentChatId?: string;
  onChatSelect?: (chatId: string) => void;
  searchTerm: string;
}

// Helper function to get time period for a timestamp
function getTimePeriod(timestamp: number): string {
  const now = new Date();
  const chatDate = new Date(timestamp);

  // Reset time to start of day for accurate day comparisons
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const chatStart = new Date(
    chatDate.getFullYear(),
    chatDate.getMonth(),
    chatDate.getDate()
  );

  const diffDays = Math.floor(
    (todayStart.getTime() - chatStart.getTime()) / (24 * 60 * 60 * 1000)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "Last 7 Days";
  if (diffDays < 30) return "Last 30 Days";
  return "Other";
}

// Helper function to group chats by time periods
function groupChatsByTime(chats: Chat[]): ChatGroup[] {
  const groups: Record<string, Chat[]> = {
    Today: [],
    Yesterday: [],
    "Last 7 Days": [],
    "Last 30 Days": [],
    Other: [],
  };

  chats.forEach((chat) => {
    const period = getTimePeriod(chat.lastActivity);
    groups[period].push(chat);
  });

  // Return only non-empty groups in the correct order
  const orderedGroups = [
    "Today",
    "Yesterday",
    "Last 7 Days",
    "Last 30 Days",
    "Other",
  ];
  return orderedGroups
    .filter((label) => groups[label].length > 0)
    .map((label) => ({
      label,
      chats: groups[label],
    }));
}

export function SidebarHistory({
  currentChatId,
  onChatSelect,
  searchTerm,
}: SidebarHistoryProps) {
  const { user } = useUser();
  const router = useRouter();

  // Convex queries and mutations for authenticated users
  const chats = useQuery(
    api.messages.getChats,
    user ? { userId: user.id } : "skip"
  );
  const deleteChat = useMutation(api.messages.deleteChat);

  // Filter and group chats based on search term
  const chatGroups = useMemo(() => {
    // Prepare unified chat list with lastActivity timestamp
    const allChats: Chat[] = user
      ? chats?.map((chat) => ({
          _id: chat._id,
          title: chat.title,
          lastActivity: chat.lastMessageTime || chat._creationTime,
        })) || []
      : [];

    // Filter chats based on search term
    const filteredChats = !searchTerm.trim()
      ? allChats
      : allChats.filter((chat) =>
          chat.title.toLowerCase().includes(searchTerm.toLowerCase())
        );

    // Group chats by time periods
    return groupChatsByTime(filteredChats);
  }, [user, chats, searchTerm]);

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
        // Navigate away if we're deleting current chat
        if (currentChatId === chatId) {
          router.push("/");
        }
      }

      toast.success("Chat deleted successfully");
    } catch (error) {
      console.error("Failed to delete chat:", error);
      toast.error("Failed to delete chat");
    }
  };

  return (
    <SidebarGroupContent>
      {chatGroups.map((group, groupIndex) => (
        <div key={group.label} className={groupIndex > 0 ? "mt-6" : ""}>
          {/* Group Header */}
          <div className="px-1 py-1 mb-2">
            <h3 className="text-xs font-bold text-sidebar-muted-foreground tracking-wider">
              {group.label}
            </h3>
          </div>

          {/* Group Chats */}
          <SidebarMenu>
            {group.chats.map((chat) => (
              <SidebarHistoryItem
                key={chat._id}
                chat={chat}
                isActive={currentChatId === chat._id}
                onChatSelect={handleChatSelect}
                onDelete={handleDeleteChat}
                isDeleting={false}
              />
            ))}
          </SidebarMenu>
        </div>
      ))}

      {/* Show message when no chats found */}
      {chatGroups.length === 0 && (
        <div className="px-2 py-4 text-center text-sidebar-muted-foreground text-sm">
          {searchTerm.trim() ? "No chats found" : "No conversations yet"}
        </div>
      )}
    </SidebarGroupContent>
  );
}
