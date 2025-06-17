import { Id } from "../../convex/_generated/dataModel";

interface UseMessageInputProps {
  user: { id: string } | null | undefined;
  currentChatId: Id<"chats"> | null;
  createNewChat: () => Promise<Id<"chats"> | null>;
  setCurrentChatId: (chatId: Id<"chats">) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function useMessageInput({
  user,
  currentChatId,
  createNewChat,
  setCurrentChatId,
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
      // Update the currentChatId so the enhanced submit handler can use it
      setCurrentChatId(activeChatId);
    }

    // Let useChat handle the message saving - just submit to AI chat
    handleSubmit(e);
  };

  return {
    handleInputChangeWithAutoCreate,
    onSubmit,
  };
}
