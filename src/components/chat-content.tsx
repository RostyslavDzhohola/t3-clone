"use client";

import type { UIMessage } from "ai";
import React, { useEffect, useRef, useState } from "react";
import type { UseChatHelpers } from "@ai-sdk/react";
import { motion } from "framer-motion";
import ChatMessage from "@/components/chat-message";

// import { toast } from "sonner";

interface ChatContentProps {
  messages: Array<UIMessage>;
  status: UseChatHelpers["status"];
  isAnonymous?: boolean;
  anonymousMessageCount?: number;
  anonymousMessageLimit?: number;
}

export default function ChatContent({
  messages,
  status,
  isAnonymous = false,
}: // anonymousMessageCount,
// anonymousMessageLimit,
ChatContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const previousScrollHeightRef = useRef<number>(0);
  const [currentDelta, setCurrentDelta] = useState<number>(0);

  // Calculate and log scroll dimensions after status changes and message updates
  useEffect(() => {
    // Only calculate when status is "ready"
    if (status !== "ready") return;

    const calculateScrollDimensions = () => {
      if (!contentRef.current) return;

      const element = contentRef.current;

      // Get the scrollable container (should be the parent with overflow-y-auto)
      const scrollContainer =
        element.closest('[style*="overflow-y: auto"], .overflow-y-auto') ||
        element.parentElement?.closest(
          '[style*="overflow-y: auto"], .overflow-y-auto'
        ) ||
        document.documentElement;

      if (scrollContainer) {
        const scrollHeight = scrollContainer.scrollHeight; // Total content height
        const previousScrollHeight = previousScrollHeightRef.current;
        const delta = scrollHeight - previousScrollHeight;

        console.log("📏 Total Content Height:", {
          totalContentHeight: scrollHeight,
          delta: delta,
        });

        // Update the previous height and current delta for this message
        previousScrollHeightRef.current = scrollHeight;
        setCurrentDelta(delta);
      }
    };

    // Calculate after a short delay to account for animations/rendering
    const timeoutId = setTimeout(calculateScrollDimensions, 100);

    return () => clearTimeout(timeoutId);
  }, [status, messages.length]); // Only recalculate when status changes or message count changes

  // Reset delta when starting a new message
  useEffect(() => {
    if (status === "submitted") {
      setCurrentDelta(0);
    }
  }, [status]);

  // SIMPLE: Just check status for immediate 80vh jump
  // TODO: Fix so it doesn't show welcome message if we're in the chat window that's still loading the chats from the database.
  // Show welcome screen when no messages
  if (messages.length === 0) {
    return (
      // Outer container: centers the welcome screen horizontally with max width and padding
      <div
        ref={contentRef}
        className="w-full max-w-3xl mx-auto px-4 py-8 pb-32"
      >
        {/* Inner container: vertically and horizontally centers the welcome
        content within 60% of viewport height */}
        <div className="flex items-center justify-center h-[60vh]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center text-gray-500"
          >
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-700">
              {isAnonymous ? "Anonymous Chat" : "Start a conversation"}
            </h3>
            <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
              Type a message below to begin your conversation. I&apos;m here to
              help with any questions you have.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    // TODO: Fix it later to be more dynamic
    <div
      ref={contentRef}
      className={`w-full mx-auto px-4 py-8 ${
        status === "submitted" || status === "streaming"
          ? "pb-[600px]" // Immediately jump to 80vh when message is submitted
          : status === "ready" && currentDelta > 700
          ? "pb-32" // Only reset to normal padding if THIS message was long
          : "pb-[80vh]" // Default to extended padding for all other cases
      }`}
      style={{ maxWidth: "var(--chat-content-max-width, 710px)" }}
    >
      <div className="space-y-2">
        {/* Render all messages - this enables smooth streaming! */}
        {messages.map((message, index) => (
          <ChatMessage
            /*
             * Using the array index as the key keeps React from
             * unmounting and remounting the component when the
             * `id` changes (e.g. when a temporary client-side id
             * is replaced by the server-generated Convex id).
             * This prevents the flicker/blink observed when
             * streaming starts or finishes.
             *
             * Because messages are only appended (and never
             * reordered or removed) this is safe and keeps keys
             * stable for the lifetime of the session.
             */
            key={index}
            message={message}
            isLastMessage={index === messages.length - 1}
          />
        ))}

        {/* Show typing indicator when submitted but not yet streaming */}
        {status === "submitted" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex justify-start mb-6"
          >
            <div className="flex items-center space-x-1 px-2 py-3">
              {/* Three dots with no background - pure indicator */}
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.15s" }}
              ></div>
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.3s" }}
              ></div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
