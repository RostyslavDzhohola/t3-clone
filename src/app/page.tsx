// src/app/page.tsx
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import ChatUI from "@/components/ChatUI";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <SignedOut>
        <h1 className="text-2xl font-bold mb-4">
          Welcome to the T3 Cloneathon
        </h1>
        <SignInButton mode="modal" />
      </SignedOut>
      <SignedIn>
        <ChatUI />
      </SignedIn>
    </main>
  );
}
