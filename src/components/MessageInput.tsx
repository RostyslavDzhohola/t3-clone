"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Paperclip, Send, ChevronDown } from "lucide-react";

interface MessageInputProps {
  input: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
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
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If Enter is pressed without Shift, submit the form
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && input.trim()) {
        // Trigger form submission by clicking the submit button
        const form = e.currentTarget.closest("form");
        if (form) {
          form.requestSubmit();
        }
      }
    }
    // Call the original onKeyDown handler
    onKeyDown(e);
  };
  return (
    <div className="w-full">
      <form onSubmit={onSubmit} className="relative">
        {/* Main Input Container */}
        <div className="relative bg-white border border-gray-200 border-b-0 rounded-t-2xl shadow-sm focus-within:ring-2 focus-within:ring-gray-400 focus-within:border-transparent focus-within:border-b-0">
          {/* Text Input */}
          <textarea
            value={input}
            onChange={onInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full px-4 pt-3 pb-2 text-sm bg-transparent border-none outline-none resize-none placeholder:text-gray-400 placeholder:text-sm focus:outline-none min-h-[1.5rem] max-h-32 overflow-y-auto"
            style={{
              height: "auto",
              minHeight: "1.5rem",
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
            }}
          />

          {/* Bottom Controls Bar */}
          <div className="flex items-center justify-between px-4 pb-3 pt-3">
            {/* Left Side Controls */}
            <div className="flex items-center space-x-2">
              {/* Model Selection */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 px-2 py-1 rounded-md font-medium h-7"
                  >
                    Gemini 2.5 Flash
                    <ChevronDown className="w-3 h-3" />
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
                className="flex items-center gap-1.5 text-xs text-gray-400 cursor-not-allowed px-2 py-1 rounded-md h-7"
              >
                <Search className="w-3 h-3" />
                Search
              </Button>

              {/* Attach Button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled
                className="flex items-center gap-1.5 text-xs text-gray-400 cursor-not-allowed px-2 py-1 rounded-md h-7"
              >
                <Paperclip className="w-3 h-3" />
                Attach
              </Button>
            </div>

            {/* Send Button */}
            <Button
              type="submit"
              size="sm"
              disabled={disabled || !input.trim()}
              className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-400 hover:bg-gray-500 text-white disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="sr-only">Send message</span>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
