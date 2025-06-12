"use client";

import React from "react";
import { type Message } from "@ai-sdk/react";
import { useUser } from "@clerk/nextjs";
import { type LLMModel } from "@/lib/models";
import WelcomeScreen from "./WelcomeScreen";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

interface ChatContentProps {
  user: ReturnType<typeof useUser>["user"];
  messages: Message[];
  status: "ready" | "submitted" | "streaming" | "error";
  input: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  selectedModel: LLMModel;
  onModelChange: (model: LLMModel) => void;
  onQuestionClick: (question: string) => void;
}

export default function ChatContent({
  user,
  messages,
  status,
  input,
  onInputChange,
  onKeyDown,
  onSubmit,
  selectedModel,
  onModelChange,
  onQuestionClick,
}: ChatContentProps) {
  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col flex-1 relative">
      {/* Chat Content */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="w-full max-w-3xl mx-auto px-4">
          {!user || !hasMessages ? (
            <WelcomeScreen
              user={user}
              hasMessages={hasMessages}
              onQuestionClick={onQuestionClick}
            />
          ) : (
            <MessageList messages={messages} status={status} />
          )}
        </div>
      </div>

      {/* Message Input Area */}
      {user && (
        <div className="absolute bottom-0 w-full">
          <div className="w-full max-w-3xl mx-auto">
            <MessageInput
              input={input}
              onInputChange={onInputChange}
              onKeyDown={onKeyDown}
              onSubmit={onSubmit}
              disabled={status !== "ready"}
              placeholder="Type your message here..."
              selectedModel={selectedModel}
              onModelChange={onModelChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}
