// src/app/page.tsx
import ChatUI from "@/components/ChatUI";
import MobileWarning from "@/components/MobileWarning";

export default function Home() {
  return (
    <>
      <MobileWarning />
      <ChatUI />
    </>
  );
}
