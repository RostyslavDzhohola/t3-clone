"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { useUser } from "@clerk/nextjs"; // type-only
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Id } from "../../convex/_generated/dataModel";

interface Chat {
  _id: Id<"chats"> | string;
  title: string;
}

interface SidebarProps {
  user: ReturnType<typeof useUser>["user"];
  chats: Chat[] | undefined;
  currentChatId: Id<"chats"> | string | null;
  isCreatingChat: boolean;
  onNewChat: () => void;
  onChatSelect: (chatId: Id<"chats"> | string) => void;
  isAnonymousLimitReached?: boolean;
}

export default function Sidebar({
  user,
  chats,
  currentChatId,
  isCreatingChat,
  onNewChat,
  onChatSelect,
  isAnonymousLimitReached,
}: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter chats based on search term
  const filteredChats = useMemo(() => {
    if (!chats || !searchTerm.trim()) return chats;
    return chats.filter((chat) =>
      chat.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [chats, searchTerm]);

  return (
    <div className="flex flex-col w-60 border-r border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between mb-4">
        <a
          href="https://github.com/RostyslavDzhohola/t3-clone"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-700 font-bold text-lg hover:text-gray-800 transition-colors"
          title="View T3 Chat Cloneathon on GitHub"
        >
          general magic
        </a>
        <a
          href="https://github.com/RostyslavDzhohola/t3-clone"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-600 hover:text-gray-700 transition-colors"
          title="View on GitHub"
        >
          <svg
            className="w-6 h-6"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              clipRule="evenodd"
            />
          </svg>
        </a>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          placeholder="Search your chats..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 pr-3 py-2 rounded-lg bg-white border-gray-300"
        />
      </div>

      <Button
        onClick={onNewChat}
        disabled={(!user && isAnonymousLimitReached) || isCreatingChat}
        className="w-full mb-4 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isCreatingChat ? "Creating..." : "New Chat"}
      </Button>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-2 mb-4">
        {filteredChats?.map((chat) => (
          <Button
            key={chat._id}
            variant="ghost"
            onClick={() => onChatSelect(chat._id)}
            className={`w-full justify-start text-left p-3 rounded-lg truncate ${
              currentChatId === chat._id
                ? "bg-gray-200 text-gray-800"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <span className="truncate">{chat.title}</span>
          </Button>
        ))}
      </div>

      <div className="mt-auto">
        <SignedOut>
          <SignInButton mode="modal">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-lg"
            >
              <span className="mr-2">→</span>
              Login
            </Button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100">
            <UserButton afterSignOutUrl="/" />
            <span className="text-sm text-gray-700">Profile</span>
          </div>
        </SignedIn>
      </div>
    </div>
  );
}
