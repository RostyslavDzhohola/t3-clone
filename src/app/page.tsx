// src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import ChatUI from "@/components/ChatUI";
import MobileWarning from "@/components/MobileWarning";

export default function Home() {
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  // Show loading while detecting mobile
  if (isLoading) {
    return null;
  }

  // Show mobile warning on mobile devices, otherwise show ChatUI for everyone
  return isMobile ? <MobileWarning /> : <ChatUI />;
}
