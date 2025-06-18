"use client";

import type { UIMessage } from "ai";
import React, { memo } from "react";
import { type Message } from "@ai-sdk/react";
import type { UseChatHelpers } from "@ai-sdk/react";
import { motion } from "framer-motion";

// import { toast } from "sonner";

interface ChatContentProps {
  messages: Array<UIMessage>;
  status: UseChatHelpers["status"];
  isAnonymous?: boolean;
  anonymousMessageCount?: number;
  anonymousMessageLimit?: number;
}

// Memoized message component for performance
const MessageBubble = memo(({ message }: { message: Message }) => {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900 border"
        }`}
      >
        <div className="whitespace-pre-wrap break-words">
          {/* This directly renders the message content, allowing smooth streaming */}
          {typeof message.content === "string"
            ? message.content
            : message.content}
        </div>
      </div>
    </motion.div>
  );
});

MessageBubble.displayName = "MessageBubble";

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
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
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
