"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import type { Message } from "@ai-sdk/react";
import { Markdown } from "@/components/markdown";
import { TodoListDisplay, ToolInvocationDisplay } from "@/components/tools";

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

          {/* 🛠️ TOOL INVOCATION DETAILS - Show behind-the-scenes tool execution */}
          {message.parts?.map((part, index) => {
            // Show tool call details (what the model is thinking)
            if (part.type === "tool-invocation" && "toolInvocation" in part) {
              const { toolInvocation } = part;
              const { toolName, state } = toolInvocation;

              const partKey = `invocation-${index}-${toolName}`;

              return (
                <div key={partKey} className="mt-4">
                  <ToolInvocationDisplay
                    toolName={toolName}
                    args={toolInvocation.args}
                    state={state === "result" ? "result" : "call"}
                    result={
                      state === "result" ? toolInvocation.result : undefined
                    }
                    timestamp={new Date()}
                  />
                </div>
              );
            }
            return null;
          })}

          {/* 🔧 TOOL INVOCATIONS RENDERING - Using new parts pattern (AI SDK v4.2+) */}
          {message.parts?.map((part, index) => {
            // Check if this part is a tool invocation
            if (part.type === "tool-invocation" && "toolInvocation" in part) {
              const { toolInvocation } = part;
              const { toolName, state } = toolInvocation;

              // Generate a unique key using the part index and tool name
              const partKey = `${index}-${toolName}`;

              if (state === "result") {
                // 🛠️ Show tool invocation result details first
                const toolInvocationElement = (
                  <ToolInvocationDisplay
                    toolName={toolName}
                    args={toolInvocation.args}
                    state="result"
                    result={toolInvocation.result}
                    timestamp={new Date()}
                  />
                );

                // Handle all todo tools that return UI-compatible data
                if (toolName === "getTodos" || toolName === "displayTodosUI") {
                  const { result } = toolInvocation;
                  if (result.success && result.todos) {
                    return (
                      <div key={partKey} className="space-y-4 mt-4">
                        {toolInvocationElement}
                        <TodoListDisplay
                          todos={result.todos}
                          count={result.count}
                          filterApplied={
                            result.filterApplied || {
                              completed: null,
                              project: null,
                            }
                          }
                          success={result.success}
                          error={result.error}
                        />
                      </div>
                    );
                  } else {
                    // Just show tool invocation if no UI data
                    return (
                      <div key={partKey} className="mt-4">
                        {toolInvocationElement}
                      </div>
                    );
                  }
                } else {
                  // For non-UI tools, just show the tool invocation
                  return (
                    <div key={partKey} className="mt-4">
                      {toolInvocationElement}
                    </div>
                  );
                }
              } else {
                // Show loading state for pending tool calls
                return (
                  <div key={partKey} className="mt-4">
                    {toolName === "getTodos" ||
                    toolName === "displayTodosUI" ? (
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
                          <span className="text-gray-600">Processing...</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
            }
            return null; // Return null for non-tool-invocation parts
          })}

          {/* 🎯 CRITICAL: Handle stored parts pattern - for loaded messages from database */}
          {/* This handles messages loaded from the database that have parts stored */}
          {(
            message as {
              parts?: Array<{
                type: string;
                toolName?: string;
                args?: Record<string, unknown>;
                result?: {
                  success?: boolean;
                  todos?: Array<{
                    id: string;
                    description: string;
                    completed: boolean;
                    project?: string;
                    tags?: string[];
                    priority?: "low" | "medium" | "high";
                    dueDate?: string;
                    createdAt: string;
                  }>;
                  count?: number;
                  filterApplied?: {
                    completed: boolean | null;
                    project: string | null;
                  };
                  error?: string;
                };
                toolCallId?: string;
              }>;
            }
          ).parts?.map((part, index: number) => {
            // 🛠️ Show stored tool call details first
            if (part.type === "tool-call") {
              const { toolName, args, toolCallId } = part;
              const partKey = `stored-call-${toolCallId || index}-${toolName}`;

              return (
                <div key={partKey} className="mt-4">
                  <ToolInvocationDisplay
                    toolName={toolName || "unknown"}
                    args={args}
                    state="call"
                    timestamp={message.createdAt}
                  />
                </div>
              );
            }
            // Handle tool-result parts that contain UI data
            if (part.type === "tool-result") {
              const { toolName, result, toolCallId, args } = part;

              // Generate a unique key using the tool call ID and tool name
              const partKey = `part-${toolCallId || index}-${toolName}`;

              // 🛠️ Show tool invocation result details first
              const resultKey = `stored-result-${
                toolCallId || index
              }-${toolName}`;
              const toolInvocationElement = (
                <div key={resultKey} className="mt-4">
                  <ToolInvocationDisplay
                    toolName={toolName || "unknown"}
                    args={args}
                    state={result?.success === false ? "error" : "result"}
                    result={result}
                    error={
                      result?.success === false ? result?.error : undefined
                    }
                    timestamp={message.createdAt}
                  />
                </div>
              );

              // Handle all todo tools that return UI-compatible data
              if (toolName === "getTodos" || toolName === "displayTodosUI") {
                if (result && result.success && result.todos) {
                  return (
                    <div key={partKey} className="space-y-4 mt-4">
                      {toolInvocationElement}
                      <TodoListDisplay
                        todos={result.todos}
                        count={result.count || 0}
                        filterApplied={
                          result.filterApplied || {
                            completed: null,
                            project: null,
                          }
                        }
                        success={result.success || false}
                        error={result.error}
                      />
                    </div>
                  );
                } else {
                  // Just show the tool invocation if there's no UI data
                  return toolInvocationElement;
                }
              } else {
                // For non-UI tools, just show the tool invocation
                return toolInvocationElement;
              }
            }

            // Handle tool-call parts (show loading state - rare for persisted data)
            if (part.type === "tool-call") {
              const { toolName, toolCallId } = part;
              const partKey = `part-call-${toolCallId || index}-${toolName}`;

              return (
                <div key={partKey} className="mt-4">
                  {toolName === "getTodos" || toolName === "displayTodosUI" ? (
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
                        <span className="text-gray-600">Processing...</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return null; // Return null for other part types
          })}
        </div>
      </div>
    </motion.div>
  );
});

ChatMessage.displayName = "ChatMessage";

export default ChatMessage;
