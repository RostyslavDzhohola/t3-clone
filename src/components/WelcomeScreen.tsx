"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { SignInButton } from "@clerk/nextjs";
import { Code, BookOpen, Lightbulb, MessageSquare } from "lucide-react";
import { useUser } from "@clerk/nextjs";

interface WelcomeScreenProps {
  user: ReturnType<typeof useUser>["user"];
  hasMessages: boolean;
  onQuestionClick?: (question: string) => void;
}

export default function WelcomeScreen({
  user,
  hasMessages,
  onQuestionClick,
}: WelcomeScreenProps) {
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <h1 className="text-3xl font-bold mb-8 text-gray-700">Welcome!</h1>
        <p className="text-gray-600 mb-8">Please sign in to start chatting</p>
        <SignInButton mode="modal">
          <Button className="bg-gray-400 hover:bg-gray-500 text-white">
            Sign In
          </Button>
        </SignInButton>
      </div>
    );
  }

  if (!hasMessages) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <h1 className="text-3xl font-bold mb-8 text-gray-700">
          How can I help you?
        </h1>
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          <Button
            variant="outline"
            className="flex items-center gap-2 px-6 py-2 rounded-full border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
          >
            <Lightbulb className="w-4 h-4" />
            Create
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2 px-6 py-2 rounded-full border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
          >
            <BookOpen className="w-4 h-4" />
            Explore
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2 px-6 py-2 rounded-full border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
          >
            <Code className="w-4 h-4" />
            Code
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2 px-6 py-2 rounded-full border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
          >
            <MessageSquare className="w-4 h-4" />
            Learn
          </Button>
        </div>
        <div className="grid gap-3 w-full max-w-xl">
          <Button
            variant="ghost"
            className="w-full justify-start text-lg text-gray-700 hover:bg-gray-100 px-4 py-3 rounded-lg"
            onClick={() => onQuestionClick?.("How does AI work?")}
          >
            How does AI work?
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-lg text-gray-700 hover:bg-gray-100 px-4 py-3 rounded-lg"
            onClick={() => onQuestionClick?.("Are black holes real?")}
          >
            Are black holes real?
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-lg text-gray-700 hover:bg-gray-100 px-4 py-3 rounded-lg"
            onClick={() =>
              onQuestionClick?.('How many Rs are in the word "strawberry"?')
            }
          >
            How many Rs are in the word &quot;strawberry&quot;?
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-lg text-gray-700 hover:bg-gray-100 px-4 py-3 rounded-lg"
            onClick={() => onQuestionClick?.("What is the meaning of life?")}
          >
            What is the meaning of life?
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
