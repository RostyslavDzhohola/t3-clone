"use client";

import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Paperclip, Send, ChevronDown } from "lucide-react";
import { getAvailableModels, type LLMModel } from "@/lib/models";

interface MessageInputProps {
  input: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  disabled?: boolean;
  placeholder?: string;
  selectedModel: LLMModel;
  onModelChange: (model: LLMModel) => void;
  availableModels?: LLMModel[];
}

export default function MessageInput({
  input,
  onInputChange,
  onKeyDown,
  onSubmit,
  disabled = false,
  placeholder = "Type your message here...",
  selectedModel,
  onModelChange,
  availableModels,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    // Call the original onKeyDown handler if provided
    onKeyDown?.(e);
  };

  // Auto-resize textarea based on content
  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
  };

  // Reset height when input is cleared
  useEffect(() => {
    if (!input && textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input]);

  const modelsToShow = availableModels || getAvailableModels();

  return (
    <div className="w-full">
      <form onSubmit={onSubmit} className="relative" suppressHydrationWarning>
        {/* Main Input Container */}
        <div className="relative bg-background border border-border border-b-0 rounded-t-lg shadow-sm focus:variant">
          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={onInputChange}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            suppressHydrationWarning
            className="w-full px-4 pt-3 pb-2 text-sm bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground placeholder:text-sm focus:outline-none min-h-[1.5rem] max-h-32 overflow-y-auto text-foreground"
            style={{
              height: "auto",
              minHeight: "1.5rem",
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
                    className="flex items-center gap-1.5 text-xs text-foreground hover:text-foreground hover:bg-muted px-2 py-1 rounded-md font-medium h-7"
                  >
                    {selectedModel.name}
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {modelsToShow.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => onModelChange(model)}
                      className={
                        selectedModel.id === model.id
                          ? "bg-muted font-medium"
                          : ""
                      }
                    >
                      {model.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Search Button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled
                className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-not-allowed px-2 py-1 rounded-md h-7"
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
                className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-not-allowed px-2 py-1 rounded-md h-7"
              >
                <Paperclip className="w-3 h-3" />
                Attach
              </Button>
            </div>

            {/* Right Side - Send Button */}
            <Button
              type="submit"
              disabled={disabled || !input.trim()}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1 rounded-md text-xs font-medium h-7 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3 h-3" />
              Send
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
