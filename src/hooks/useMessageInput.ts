import { type Message } from "@ai-sdk/react";
import { Id } from "../../convex/_generated/dataModel";
import { generateChatTitle } from "@/lib/chatHelpers";

interface UseMessageInputProps {
  user: { id: string } | null | undefined;
  currentChatId: Id<"chats"> | null;
  saveMessage: (args: {
    chatId: Id<"chats">;
    userId: string;
    role: "user" | "assistant";
    body: string;
  }) => Promise<Id<"messages">>;
  updateChatTitle: (args: {
    chatId: Id<"chats">;
    title: string;
  }) => Promise<null>;
  createNewChat: () => Promise<Id<"chats"> | null>;
  setCurrentChatId: (chatId: Id<"chats">) => void;
  messages: Message[];
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function useMessageInput({
  user,
  currentChatId,
  saveMessage,
  updateChatTitle,
  createNewChat,
  setCurrentChatId,
  messages,
  handleSubmit,
}: UseMessageInputProps) {
  // Auto-create chat when user starts typing (if no current chat)
  const handleInputChangeWithAutoCreate = async (
    e: React.ChangeEvent<HTMLInputElement>,
    originalHandler: (e: React.ChangeEvent<HTMLInputElement>) => void
  ) => {
    originalHandler(e);

    // If user starts typing and there's no current chat, create one
    if (!currentChatId && e.target.value.trim() && user) {
      console.log("⌨️ Auto-creating chat because user started typing");
      const newChatId = await createNewChat();
      if (newChatId) {
        setCurrentChatId(newChatId);
      }
    }
  };

  // Auto-generate chat title from first user message
  const updateTitleFromFirstMessage = async (
    chatId: Id<"chats">,
    firstMessage: string
  ) => {
    const title = generateChatTitle(firstMessage);
    try {
      console.log("🏷️ Updating chat title to:", title);
      await updateChatTitle({
        chatId,
        title,
      });
      console.log("✅ Chat title updated");
    } catch (error) {
      console.error("❌ Failed to update chat title:", error);
    }
  };

  // Handle form submission (both Enter key and Send button)
  const onSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    input: string
  ) => {
    e.preventDefault();
    console.log("📤 Form submitted with input:", input.slice(0, 50) + "...");

    // Ensure we have a chat to send the message to
    let activeChatId = currentChatId;
    if (!activeChatId && user) {
      console.log("🆕 No active chat, creating one for message submission");
      activeChatId = await createNewChat();
      if (!activeChatId) {
        console.error("❌ Failed to create chat for message");
        return;
      }
    }

    // Save user message to Convex
    if (user && activeChatId && input.trim()) {
      const isFirstMessage = messages.length === 0;

      try {
        console.log("💾 Saving user message to Convex...");
        const messageId = await saveMessage({
          chatId: activeChatId,
          userId: user.id,
          role: "user",
          body: input,
        });
        console.log("✅ User message saved with ID:", messageId);

        // Update chat title if this is the first message
        if (isFirstMessage) {
          await updateTitleFromFirstMessage(activeChatId, input);
        }
      } catch (error) {
        console.error("❌ Failed to save user message:", error);
      }
    }

    // Submit to AI chat
    handleSubmit(e);
  };

  // Handle Enter key specifically
  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      console.log("⏎ Enter key pressed, submitting form");
      const form = event.currentTarget.closest("form");
      if (form) {
        const formEvent = new Event("submit", {
          bubbles: true,
          cancelable: true,
        });
        form.dispatchEvent(formEvent);
      }
    }
  };

  return {
    handleInputChangeWithAutoCreate,
    onSubmit,
    handleKeyDown,
  };
}
