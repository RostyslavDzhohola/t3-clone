import { type Message } from "@ai-sdk/react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

import { useAnonymousChat, type LocalStorageChat } from "./useAnonymousChat";

interface UseMessageHandlingProps {
  user: any;
  currentChatId: Id<"chats"> | string | null;
  anonymousChat: ReturnType<typeof useAnonymousChat>;
}

export function useMessageHandling({
  user,
  currentChatId,
  anonymousChat,
}: UseMessageHandlingProps) {
  // Convex mutations (only for authenticated users)
  const saveMessage = useMutation(api.messages.saveMessage);
  const updateChatTitle = useMutation(api.messages.updateChatTitle);

  const handleUserMessage = async (
    message: Message,
    isFirstMessage: boolean
  ) => {
    if (
      user &&
      currentChatId &&
      typeof currentChatId === "string" &&
      currentChatId.length > 10
    ) {
      // Authenticated user - save to Convex
      try {
        console.log("💾 Saving user message to Convex...");
        const messageId = await saveMessage({
          chatId: currentChatId as Id<"chats">,
          userId: user.id,
          role: "user",
          body: message.content,
        });
        console.log("✅ User message saved with ID:", messageId);

        // Update chat title if this is the first message
        if (isFirstMessage) {
          const title =
            message.content.slice(0, 30) +
            (message.content.length > 30 ? "..." : "");
          try {
            console.log("🏷️ Updating chat title to:", title);
            await updateChatTitle({
              chatId: currentChatId as Id<"chats">,
              title,
            });
            console.log("✅ Chat title updated");
          } catch (error) {
            console.error("❌ Failed to update chat title:", error);
          }
        }
      } catch (error) {
        console.error("❌ Failed to save user message:", error);
      }
    } else if (!user && anonymousChat.currentAnonymousChat) {
      // Anonymous user - save to localStorage and sync with useChat
      const currentChat = anonymousChat.currentAnonymousChat;
      const updatedMessages = [...currentChat.messages, message];

      // Update chat title if this is the first message
      let title = currentChat.title;
      if (isFirstMessage) {
        title =
          message.content.slice(0, 30) +
          (message.content.length > 30 ? "..." : "");
      }

      anonymousChat.updateAnonymousChat(currentChat.id, {
        messages: updatedMessages,
        title,
      });

      // Increment message count for user message
      anonymousChat.incrementMessageCount();

      console.log("✅ User message saved to localStorage");
    }
  };

  const handleAssistantMessage = async (message: Message) => {
    if (
      user &&
      currentChatId &&
      typeof currentChatId === "string" &&
      currentChatId.length > 10
    ) {
      // Authenticated user - save to Convex
      try {
        console.log("💾 Saving AI message to Convex...");
        const messageId = await saveMessage({
          chatId: currentChatId as Id<"chats">,
          userId: user.id,
          role: "assistant",
          body: message.content,
        });
        console.log("✅ AI message saved with ID:", messageId);
      } catch (error) {
        console.error("❌ Failed to save AI message:", error);
      }
    } else if (!user && anonymousChat.currentAnonymousChat) {
      // Anonymous user - save to localStorage
      const currentChat = anonymousChat.currentAnonymousChat;
      const updatedMessages = [...currentChat.messages, message];

      anonymousChat.updateAnonymousChat(currentChat.id, {
        messages: updatedMessages,
      });

      // Increment message count for assistant message
      anonymousChat.incrementMessageCount();

      console.log("✅ AI message saved to localStorage");
    }
  };

  return {
    handleUserMessage,
    handleAssistantMessage,
  };
}
