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
      <div className="w-full max-w-3xl mx-auto px-4 py-6 pb-32">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center text-gray-500">
            <h3 className="text-xl font-semibold mb-2">
              {isAnonymous ? "Anonymous Chat" : "Start a conversation"}
            </h3>
            <p>Type a message to begin...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 pb-32">
      <div className="space-y-4">
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-gray-100 border rounded-2xl px-4 py-3">
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
          </motion.div>
        )}
      </div>
    </div>
  );
}
