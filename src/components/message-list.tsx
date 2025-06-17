"use client";

import React from "react";
import { type Message } from "@ai-sdk/react";
import StreamingMessageRenderer from "./streaming-message-renderer";

/**
 * Individual chat bubble – memoized to avoid unnecessary re-renders once its
 * content is stable. We intentionally compare both the message id and content
 * because the assistant message content mutates while streaming.
 */
const MessageBubble = React.memo(
  function MessageBubble({
    message,
    isStreamingAssistant,
  }: {
    message: Message;
    isStreamingAssistant: boolean;
  }) {
    if (message.role === "user") {
      return (
        <div className="flex justify-end mb-6">
          <div className="max-w-[75%] px-4 py-3 rounded-2xl bg-gray-300 text-gray-800 text-sm leading-relaxed">
            {message.content}
          </div>
        </div>
      );
    }

    return (
      <div className="w-full mb-4">
        <StreamingMessageRenderer
          content={message.content}
          isStreaming={isStreamingAssistant}
        />
      </div>
    );
  },
  (prev, next) =>
    prev.message.content === next.message.content &&
    prev.isStreamingAssistant === next.isStreamingAssistant
);

interface MessageListProps {
  messages: Message[];
  status: "ready" | "submitted" | "streaming" | "error";
}

function MessageListComponent({ messages, status }: MessageListProps) {
  return (
    <div className="space-y-8 pt-6 pb-8">
      {messages.map((m: Message, idx: number) => {
        const isStreamingAssistant =
          status === "streaming" &&
          idx === messages.length - 1 &&
          m.role === "assistant";

        return (
          <MessageBubble
            key={m.id}
            message={m}
            isStreamingAssistant={isStreamingAssistant}
          />
        );
      })}
      {(status === "submitted" || status === "streaming") && (
        <div className="w-full mb-6">
          <div className="flex items-center gap-3">
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
      )}
    </div>
  );
}

export default React.memo(MessageListComponent);
