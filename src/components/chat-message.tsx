"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import type { Message } from "@ai-sdk/react";
import { Markdown } from "@/components/markdown";
import { TodoListDisplay } from "@/components/tools/todo-list-display";

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
                // - Semantic background and text colors
                // - Rounded corners and padding
                // - Border and shadow for chat bubble effect
                "max-w-[85%] rounded-2xl px-5 py-4 mr-5 bg-muted text-foreground shadow-sm border border-border/50"
              : // 🤖 ASSISTANT MESSAGE STYLING
                // - Full width (w-full)
                // - No background color (transparent)
                // - Minimal styling for clean appearance
                "w-full rounded-2xl px-5 py-4 text-foreground"
          }
        `}
      >
        <div
          className={`
            prose prose-sm max-w-none overflow-hidden
            ${
              isUser
                ? // 👤 USER MESSAGE TEXT STYLING
                  // Semantic colors for consistent typography
                  "prose-foreground prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground"
                : // 🤖 ASSISTANT MESSAGE TEXT STYLING
                  // Semantic colors for consistent typography
                  "prose-foreground prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground"
            }
            prose-p:mb-1 prose-p:leading-relaxed prose-p:last:mb-0
            prose-headings:mb-3 prose-headings:mt-4 prose-headings:first:mt-0
            prose-ul:my-2 prose-ol:my-2 prose-li:mb-1
            prose-pre:my-3 prose-pre:first:mt-0 prose-pre:last:mb-0
            prose-blockquote:my-3 prose-blockquote:first:mt-0 prose-blockquote:last:mb-0
          `}
        >
          {/* 📝 MESSAGE CONTENT RENDERING */}
          {typeof message.content === "string" ? (
            <Markdown>{message.content}</Markdown>
          ) : (
            <Markdown>{String(message.content)}</Markdown>
          )}

          {/* 🔧 TOOL INVOCATIONS RENDERING - Generative UI */}
          {message.toolInvocations?.map((toolInvocation) => {
            const { toolName, toolCallId, state } = toolInvocation;

            if (state === "result") {
              if (toolName === "displayTodosUI") {
                const { result } = toolInvocation;
                return (
                  <div key={toolCallId} className="mt-4">
                    <TodoListDisplay {...result} />
                  </div>
                );
              }
            } else {
              // Show loading state for pending tool calls
              return (
                <div key={toolCallId} className="mt-4">
                  {toolName === "displayTodosUI" ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                        <span className="text-gray-600">
                          Loading your todos...
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                        <span className="text-gray-600">Loading...</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            }
          })}
        </div>
      </div>
    </motion.div>
  );
});

ChatMessage.displayName = "ChatMessage";

export default ChatMessage;
