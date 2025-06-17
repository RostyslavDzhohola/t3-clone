"use client";

import React, { useEffect } from "react";
import { type Message } from "@ai-sdk/react";

// import WelcomeScreen from "./WelcomeScreen";
import MessageList from "./MessageList";
import { toast } from "sonner";

interface ChatContentProps {
  messages: Message[];
  status: "ready" | "submitted" | "streaming" | "error";
  isAnonymous?: boolean;
  anonymousMessageCount?: number;
  anonymousMessageLimit?: number;
}

export default function ChatContent({
  messages,
  status,
  isAnonymous = false,
  anonymousMessageCount,
  anonymousMessageLimit,
}: ChatContentProps) {
  // Calculate remaining messages for anonymous users
  const remainingMessages =
    isAnonymous &&
    anonymousMessageCount !== undefined &&
    anonymousMessageLimit !== undefined
      ? Math.max(0, anonymousMessageLimit - anonymousMessageCount)
      : null;

  // Show toast notification when anonymous user gets close to limit
  useEffect(() => {
    if (
      isAnonymous &&
      anonymousMessageCount !== undefined &&
      anonymousMessageLimit !== undefined &&
      remainingMessages !== null &&
      remainingMessages <= 3 &&
      remainingMessages > 0 &&
      anonymousMessageCount > 0
    ) {
      toast.warning(
        `You have ${remainingMessages} message${
          remainingMessages !== 1 ? "s" : ""
        } left.`,
        {
          description: "Sign in to get unlimited access to all models.",
          action: {
            label: "Sign In",
            onClick: () => {
              // Find and click the SignInButton
              const signInButton = document.querySelector(
                '[data-clerk-element="signInButton"]'
              ) as HTMLElement;
              if (signInButton) {
                signInButton.click();
              }
            },
          },
          duration: 5000,
        }
      );
    }
  }, [
    isAnonymous,
    anonymousMessageCount,
    anonymousMessageLimit,
    remainingMessages,
  ]);

  return (
    <div className="flex flex-col flex-1 relative">
      {/* Chat Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-3xl mx-auto px-4 pb-32">
          <MessageList messages={messages} status={status} />
        </div>
      </div>
      {/* Message Input handled as an overlay in ChatUI */}
    </div>
  );
}
