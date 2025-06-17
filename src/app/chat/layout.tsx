import { ChatLayout } from "@/components";

interface ChatLayoutPageProps {
  children: React.ReactNode;
}

export default async function ChatLayoutPage({
  children,
}: ChatLayoutPageProps) {
  return <ChatLayout>{children}</ChatLayout>;
}
