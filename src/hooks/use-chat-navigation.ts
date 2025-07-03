import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Id } from "../../convex/_generated/dataModel";

interface Chat {
  _id: Id<"chats">;
  title: string;
}

interface UseChatNavigationProps {
  user: { id: string } | null | undefined;
  chats: Chat[] | undefined;
}

interface UseChatNavigationReturn {
  currentChatId: Id<"chats"> | string | null;
  setCurrentChatId: (chatId: Id<"chats"> | string | null) => void;
  handleChatSelect: (chatId: Id<"chats"> | string) => void;
  autoSelectFirstChat: () => void;
  syncChatFromUrl: () => void;
}

export function useChatNavigation({
  user,
  chats,
}: UseChatNavigationProps): UseChatNavigationReturn {
  const router = useRouter();
  const pathname = usePathname();
  const [currentChatId, setCurrentChatId] = useState<
    Id<"chats"> | string | null
  >(null);

  // Switch to a different chat
  const handleChatSelect = (chatId: Id<"chats"> | string) => {
    console.log("🔄 Switching to chat:", chatId);

    if (user && typeof chatId === "string" && chatId.length > 10) {
      // Authenticated user with Convex chat
      setCurrentChatId(chatId as Id<"chats">);
      router.push(`/chat/${chatId}`);
    } else if (!user && typeof chatId === "string") {
      setCurrentChatId(chatId);
    }
  };

  // Auto-select first chat if none selected and we're on the home page
  const autoSelectFirstChat = useCallback(() => {
    if (pathname === "/" && !currentChatId) {
      if (user && chats && chats.length > 0) {
        const firstChat = chats[0];
        console.log("🏠 Auto-selecting first chat:", firstChat._id);
        setCurrentChatId(firstChat._id);
        router.push(`/chat/${firstChat._id}`);
      }
    }
  }, [pathname, currentChatId, user, chats, router]);

  // Extract chat ID from URL if we're on a chat page (only for authenticated users)
  const syncChatFromUrl = useCallback(() => {
    if (user && pathname.startsWith("/chat/")) {
      const chatIdFromUrl = pathname.split("/chat/")[1];
      if (chatIdFromUrl && chatIdFromUrl !== currentChatId) {
        console.log("🔗 Setting chat ID from URL:", chatIdFromUrl);
        setCurrentChatId(chatIdFromUrl as Id<"chats">);
      }
    }
  }, [user, pathname, currentChatId]);

  // Auto-select first chat effect
  useEffect(() => {
    autoSelectFirstChat();
  }, [user, chats, currentChatId, pathname, autoSelectFirstChat]);

  // URL synchronization effect
  useEffect(() => {
    syncChatFromUrl();
  }, [user, pathname, currentChatId, syncChatFromUrl]);

  return {
    currentChatId,
    setCurrentChatId,
    handleChatSelect,
    autoSelectFirstChat,
    syncChatFromUrl,
  };
}
