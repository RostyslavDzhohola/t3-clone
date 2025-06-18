"use client";

import type { UIMessage } from "ai";
import React from "react";
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
  // Show welcome screen when no messages
  if (messages.length === 0) {
    return (
      // Outer container: centers the welcome screen horizontally with max width and padding
      <div className="w-full max-w-3xl mx-auto px-4 py-8 pb-32">
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
    <div
      className="w-full mx-auto px-4 py-8 pb-32"
      style={{ maxWidth: "var(--chat-content-max-width, 710px)" }}
    >
      <div className="space-y-2">
        {/* Render all messages - this enables smooth streaming! */}
        {messages.map((message, index) => (
          <ChatMessage
            key={message.id}
            message={message}
            isLastMessage={index === messages.length - 1}
          />
        ))}

        {/* Show typing indicator when streaming */}
        {status === "streaming" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex justify-start mb-6"
          >
            <div className="bg-gray-100 border border-gray-200/50 rounded-2xl px-5 py-4 shadow-sm">
              <div className="flex space-x-2 items-center">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
