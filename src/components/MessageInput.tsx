"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Paperclip, Send, ChevronDown } from "lucide-react";

interface MessageInputProps {
  input: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function MessageInput({
  input,
  onInputChange,
  onKeyDown,
  onSubmit,
  disabled = false,
  placeholder = "Type your message here...",
}: MessageInputProps) {
  return (
    <div className="w-full">
      <form onSubmit={onSubmit} className="relative">
        {/* Main Input Container */}
        <div className="relative bg-white border border-gray-200 border-b-0 rounded-t-2xl shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent focus-within:border-b-0">
          {/* Text Input */}
          <Input
            value={input}
            onChange={onInputChange}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full px-4 py-6 text-base bg-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none placeholder:text-gray-500"
          />

          {/* Bottom Controls Bar */}
          <div className="flex items-center justify-between px-4 pb-4">
            {/* Left Side Controls */}
            <div className="flex items-center space-x-3">
              {/* Model Selection */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 px-3 py-1.5 rounded-lg font-medium"
                  >
                    Gemini 2.5 Flash
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem>Gemini 2.5 Flash</DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    GPT-4 (Coming Soon)
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    Claude (Coming Soon)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Search Button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled
                className="flex items-center gap-2 text-sm text-gray-400 cursor-not-allowed px-3 py-1.5 rounded-lg"
              >
                <Search className="w-4 h-4" />
                Search
              </Button>

              {/* Attach Button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled
                className="flex items-center gap-2 text-sm text-gray-400 cursor-not-allowed px-3 py-1.5 rounded-lg"
              >
                <Paperclip className="w-4 h-4" />
                Attach
              </Button>
            </div>

            {/* Send Button */}
            <Button
              type="submit"
              size="sm"
              disabled={disabled || !input.trim()}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
