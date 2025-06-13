"use client";

import React, { useEffect } from "react";
import { type Message } from "@ai-sdk/react";

import WelcomeScreen from "./WelcomeScreen";
import MessageList from "./MessageList";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { SignInButton } from "@clerk/nextjs";
import { toast } from "sonner";

interface ChatContentProps {
  messages: Message[];
  status: "ready" | "submitted" | "streaming" | "error";
  onQuestionClick: (question: string) => void;
  isAnonymous?: boolean;
  isAnonymousLimitReached?: boolean;
  anonymousMessageCount?: number;
  anonymousMessageLimit?: number;
}

export default function ChatContent({
  messages,
  status,
  onQuestionClick,
  isAnonymous = false,
  isAnonymousLimitReached = false,
  anonymousMessageCount,
  anonymousMessageLimit,
}: ChatContentProps) {
  const hasMessages = messages.length > 0;

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
      {/* Warning Alert for anonymous limit reached */}
      {isAnonymous && isAnonymousLimitReached && (
        <div className="p-4 border-b border-gray-200">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You&apos;ve reached your message limit for anonymous usage.{" "}
              <SignInButton mode="modal">
                <button
                  className="underline font-medium hover:text-blue-600 transition-colors"
                  data-clerk-element="signInButton"
                >
                  Sign in
                </button>
              </SignInButton>{" "}
              to continue chatting with unlimited access to all models.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Chat Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-3xl mx-auto px-4 pb-32">
          {!hasMessages ? (
            <WelcomeScreen
              hasMessages={hasMessages}
              onQuestionClick={onQuestionClick}
            />
          ) : (
            <MessageList messages={messages} status={status} />
          )}
        </div>
      </div>
    </div>
  );
}
