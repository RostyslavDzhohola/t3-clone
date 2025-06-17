import ChatUI from "@/components/chat-ui";

interface ChatPageProps {
  params: Promise<{ chatId: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { chatId } = await params;

  // For now, just render ChatUI - we'll modify it to extract sidebar in next step
  return <ChatUI />;
}
