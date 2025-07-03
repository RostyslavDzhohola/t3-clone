import { useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

export function useChatManagement(currentChatId?: string) {
  const { user } = useUser();
  const router = useRouter();

  // Convex operations for authenticated users
  const chats = useQuery(
    api.messages.getChats,
    user ? { userId: user.id } : "skip"
  );
  const createChat = useMutation(api.messages.createChat);
  const deleteChat = useMutation(api.messages.deleteChat);

  // State management
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  // Create new chat
  const createNewChat = useCallback(async () => {
    if (!user) {
      const newChatId = crypto.randomUUID();

      return newChatId;
    } else {
      // Authenticated user - create in Convex
      const chatId = await createChat({
        userId: user.id,
        title: "New Chat",
      });
      return chatId;
    }
  }, [user, createChat]);

  // Handle new chat creation with navigation
  const handleNewChat = useCallback(async () => {
    if (isCreatingChat) return;
    setIsCreatingChat(true);

    try {
      const chatId = await createNewChat();
      router.push(`/chat/${chatId}`);
    } catch (error) {
      console.error("Failed to create chat:", error);
      toast.error("Failed to create new chat");
    } finally {
      setIsCreatingChat(false);
    }
  }, [isCreatingChat, createNewChat, router]);

  // Handle delete chat
  const handleDeleteChat = useCallback(
    async (chatId: Id<"chats"> | string) => {
      try {
        if (user) {
          await deleteChat({
            chatId: chatId as Id<"chats">,
            userId: user.id,
          });

          if (currentChatId === chatId) {
            router.push("/");
          }
        }

        toast.success("Chat deleted successfully");
      } catch (error) {
        console.error("Failed to delete chat:", error);
        toast.error("Failed to delete chat");
      }
    },
    [user, currentChatId, deleteChat, router]
  );

  const allChats = user
    ? chats?.map((chat) => ({ _id: chat._id, title: chat.title })) || []
    : [];

  return {
    isCreatingChat,
    allChats,
    currentChatId,
    handleNewChat,
    handleDeleteChat,
    createNewChat,
  };
}
