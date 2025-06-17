import { ChatUI } from "@/components";

interface ChatPageProps {
  params: Promise<{ chatId: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { chatId } = await params;

  // ChatLayout will now handle the chatId via URL params, but we still pass it explicitly
  return <ChatUI chatId={chatId} />;
}
