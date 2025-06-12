"use client";

import React, { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Monitor, Smartphone, X } from "lucide-react";

export default function MobileWarning() {
  const [isMobile, setIsMobile] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

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

    // Listen for resize events
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Don't render if not mobile or if dismissed
  if (!isMobile || isDismissed) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 w-full">
      <Alert className="border-orange-200 bg-orange-50 text-orange-800 rounded-none border-l-0 border-r-0 border-t-0">
        <div className="flex items-start gap-3">
          <Smartphone className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <AlertDescription className="text-sm leading-relaxed">
              <strong>Mobile Notice:</strong> This application is not optimized
              for mobile devices. For the best experience, please use a desktop
              computer or desktop web browser.
            </AlertDescription>
            <div className="flex items-center gap-2 mt-2 text-xs text-orange-700">
              <Monitor className="h-4 w-4" />
              <span>Recommended: Desktop or laptop computer</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(true)}
            className="flex-shrink-0 h-auto p-1 hover:bg-orange-100 text-orange-600 hover:text-orange-800"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      </Alert>
    </div>
  );
}
