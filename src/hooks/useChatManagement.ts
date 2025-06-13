import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAnonymousChat } from "./useAnonymousChat";

interface UseChatManagementProps {
  user: any;
  anonymousChat: ReturnType<typeof useAnonymousChat>;
}

export function useChatManagement({
  user,
  anonymousChat,
}: UseChatManagementProps) {
  const router = useRouter();
  const [currentChatId, setCurrentChatId] = useState<
    Id<"chats"> | string | null
  >(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  // Convex mutations (only for authenticated users)
  const createChat = useMutation(api.messages.createChat);

  const createNewChat = async (): Promise<string | null> => {
    if (isCreatingChat) {
      console.warn("⚠️ Already creating a chat, skipping...");
      return null;
    }

    console.log("🆕 Creating new chat...");
    setIsCreatingChat(true);

    try {
      if (user) {
        // Authenticated user - use Convex
        const chatId = await createChat({
          userId: user.id,
          title: "New Chat",
        });

        console.log("✅ Chat created with ID:", chatId);
        setCurrentChatId(chatId);
        router.push(`/chat/${chatId}`);
        return chatId;
      } else {
        // Anonymous user - use localStorage
        const newChatId = anonymousChat.createAnonymousChat();
        setCurrentChatId(newChatId);
        return newChatId;
      }
    } catch (error) {
      console.error("❌ Failed to create new chat:", error);
      return null;
    } finally {
      setIsCreatingChat(false);
    }
  };

  const selectChat = (chatId: Id<"chats"> | string) => {
    console.log("🔄 Switching to chat:", chatId);

    if (user && typeof chatId === "string" && chatId.length > 10) {
      // Authenticated user with Convex chat
      setCurrentChatId(chatId as Id<"chats">);
      router.push(`/chat/${chatId}`);
    } else if (!user && typeof chatId === "string") {
      // Anonymous user with localStorage chat
      const chat = anonymousChat.selectAnonymousChat(chatId);
      if (chat) {
        setCurrentChatId(chatId);
      }
    }
  };

  return {
    currentChatId,
    setCurrentChatId,
    isCreatingChat,
    createNewChat,
    selectChat,
  };
}
