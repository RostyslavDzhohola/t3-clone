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
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-6`}
    >
      <div
        className={`
          group relative transition-all duration-200 ease-out
          ${
            isUser
              ? "max-w-[85%] rounded-2xl px-5 py-4 bg-gray-100 text-gray-900 shadow-sm border border-gray-200/50"
              : "w-full rounded-2xl px-5 py-4 text-gray-900"
          }
        `}
      >
        <div
          className={`
            prose prose-sm max-w-none overflow-hidden
            ${
              isUser
                ? "prose-gray prose-headings:text-gray-900 prose-p:text-gray-800 prose-strong:text-gray-900"
                : "prose-gray prose-headings:text-gray-900 prose-p:text-gray-800 prose-strong:text-gray-900"
            }
            prose-p:mb-1 prose-p:leading-relaxed prose-p:last:mb-0
            prose-headings:mb-3 prose-headings:mt-4 prose-headings:first:mt-0
            prose-ul:my-2 prose-ol:my-2 prose-li:mb-1
            prose-pre:my-3 prose-pre:first:mt-0 prose-pre:last:mb-0
            prose-blockquote:my-3 prose-blockquote:first:mt-0 prose-blockquote:last:mb-0
          `}
        >
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
