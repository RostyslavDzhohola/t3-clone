"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import type { Message } from "@ai-sdk/react";
import { Markdown } from "@/components/markdown";

interface ChatMessageProps {
  message: Message;
  isLastMessage?: boolean;
}

const ChatMessage = memo(({ message }: ChatMessageProps) => {
  // 🔍 MESSAGE TYPE DETECTION
  // This determines whether the message is from the user or the AI assistant
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      // 📍 LAYOUT POSITIONING
      // User messages: aligned to the right (justify-end)
      // Assistant messages: aligned to the left (justify-start)
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-7`}
    >
      <div
        className={`
          group relative transition-all duration-200 ease-out
          ${
            isUser
              ? // 👤 USER MESSAGE STYLING
                // - Limited width (max-w-[85%])
                // - Gray background (bg-gray-100)
                // - Rounded corners and padding
                // - Border and shadow for chat bubble effect
                "max-w-[85%] rounded-2xl px-5 py-4 mr-5 bg-gray-100 text-gray-900 shadow-sm border border-gray-200/50"
              : // 🤖 ASSISTANT MESSAGE STYLING
                // - Full width (w-full)
                // - No background color (transparent)
                // - Minimal styling for clean appearance
                "w-full rounded-2xl px-5 py-4 text-gray-900"
          }
        `}
      >
        <div
          className={`
            prose prose-sm max-w-none overflow-hidden
            ${
              isUser
                ? // 👤 USER MESSAGE TEXT STYLING
                  // Same prose styling for consistent typography
                  "prose-gray prose-headings:text-gray-900 prose-p:text-gray-800 prose-strong:text-gray-900"
                : // 🤖 ASSISTANT MESSAGE TEXT STYLING
                  // Same prose styling for consistent typography
                  "prose-gray prose-headings:text-gray-900 prose-p:text-gray-800 prose-strong:text-gray-900"
            }
            prose-p:mb-1 prose-p:leading-relaxed prose-p:last:mb-0
            prose-headings:mb-3 prose-headings:mt-4 prose-headings:first:mt-0
            prose-ul:my-2 prose-ol:my-2 prose-li:mb-1
            prose-pre:my-3 prose-pre:first:mt-0 prose-pre:last:mb-0
            prose-blockquote:my-3 prose-blockquote:first:mt-0 prose-blockquote:last:mb-0
          `}
        >
          {/* 📝 MESSAGE CONTENT RENDERING
              Both user and assistant messages use the same Markdown component
              for consistent text rendering and formatting */}
          {typeof message.content === "string" ? (
            <Markdown>{message.content}</Markdown>
          ) : (
            <Markdown>{String(message.content)}</Markdown>
          )}
        </div>
      </div>
    </motion.div>
  );
});

ChatMessage.displayName = "ChatMessage";

export default ChatMessage;
