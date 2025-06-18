"use client";

import { Id } from "../../convex/_generated/dataModel";
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
} from "@/components/ui/sidebar";
import DeleteChatDialog from "./delete-chat-dialog";

interface Chat {
  _id: Id<"chats"> | string;
  title: string;
}

interface SidebarHistoryItemProps {
  chat: Chat;
  isActive: boolean;
  onChatSelect: (chatId: string) => void;
  onDelete: (chatId: Id<"chats"> | string) => void;
  isDeleting: boolean;
}

export function SidebarHistoryItem({
  chat,
  isActive,
  onChatSelect,
  onDelete,
  isDeleting,
}: SidebarHistoryItemProps) {
  return (
    <SidebarMenuItem key={chat._id}>
      <SidebarMenuButton
        onClick={() => onChatSelect(chat._id as string)}
        isActive={isActive}
        className={`flex items-center justify-between w-full ${
          isActive
            ? "!bg-gray-200 dark:!bg-gray-700 !text-gray-900 dark:!text-gray-100 !font-medium"
            : ""
        }`}
      >
        <span className="truncate flex-1 text-left">{chat.title}</span>
      </SidebarMenuButton>
      <SidebarMenuAction showOnHover>
        <DeleteChatDialog
          chatTitle={chat.title}
          onDelete={() => onDelete(chat._id)}
          isDeleting={isDeleting}
        />
      </SidebarMenuAction>
    </SidebarMenuItem>
  );
}
