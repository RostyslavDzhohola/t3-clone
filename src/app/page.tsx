// src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ChatUI } from "@/components";
import WelcomeScreen from "@/components/welcome-screen";
import MobileWarning from "@/components/mobile-warning";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useChatNavigation } from "@/hooks";

export default function Home() {
  const { user, isLoaded } = useUser();
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get authenticated user chats for sidebar
  const chats = useQuery(
    api.messages.getChats,
    user ? { userId: user.id } : "skip"
  );

  // Use proper chat navigation
  const { currentChatId, handleChatSelect } = useChatNavigation({
    user,
    chats,
  });

  useEffect(() => {
    const checkIsMobile = () => {
      // Check both user agent and screen size
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileUA =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          userAgent
        );
      const isSmallScreen = window.innerWidth < 768; // md breakpoint

      return isMobileUA || isSmallScreen;
    };

    const handleResize = () => {
      setIsMobile(checkIsMobile());
    };

    // Initial check
    setIsMobile(checkIsMobile());
    setIsLoading(false);

    // Listen for resize events
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Show loading while detecting mobile and auth status
  if (isLoading || !isLoaded) {
    return null;
  }

  // Show mobile warning on mobile devices
  if (isMobile) {
    return <MobileWarning />;
  }

  // Show welcome screen for unsigned users
  if (!user) {
    return <WelcomeScreen />;
  }

  // Show chat interface with sidebar for signed-in users
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar
          currentChatId={currentChatId || undefined}
          onChatSelect={handleChatSelect}
        />

        <main className="flex-1 flex flex-col">
          <ChatUI chatId={currentChatId || undefined} />
        </main>
      </div>
    </SidebarProvider>
  );
}
