"use client";

import React from "react";
import { type Message } from "@ai-sdk/react";
import MessageRenderer from "./MessageRenderer";

interface MessageListProps {
  messages: Message[];
  status: "ready" | "submitted" | "streaming" | "error";
}

export default function MessageList({ messages, status }: MessageListProps) {
  return (
    <div className="space-y-8 pt-6 pb-8">
      {messages.map((m: Message) => (
        <div key={m.id} className="w-full">
          {m.role === "user" ? (
            <div className="flex justify-end mb-6">
              <div className="max-w-[75%] px-4 py-3 rounded-2xl bg-gray-300 text-gray-800 text-sm leading-relaxed">
                {m.content}
              </div>
            </div>
          ) : (
            <div className="w-full mb-4">
              <MessageRenderer content={m.content} />
            </div>
          )}
        </div>
      ))}
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
