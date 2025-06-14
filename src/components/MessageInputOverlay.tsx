"use client";

import MessageInput from "./MessageInput";
import RemainingLimitBanner from "./RemainingLimitBanner";
import { LLMModel } from "@/lib/models";

interface MessageInputOverlayProps {
  input: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  disabled: boolean;
  placeholder: string;
  selectedModel: LLMModel;
  onModelChange: (model: LLMModel) => void;
  showBanner: boolean;
  remaining: number;
  limitReached: boolean;
  onBannerClose: () => void;
}

export default function MessageInputOverlay({
  input,
  onInputChange,
  onKeyDown,
  onSubmit,
  disabled,
  placeholder,
  selectedModel,
  onModelChange,
  showBanner,
  remaining,
  limitReached,
  onBannerClose,
}: MessageInputOverlayProps) {
  return (
    <>
      <div className="fixed bottom-0 left-[230px] right-0 flex justify-center pt-4 z-40 pointer-events-none ">
        <div className="w-full max-w-3xl pointer-events-auto">
          <div className="backdrop-blur-xs border border-gray-200 rounded-t-2xl shadow-lg px-2 pt-2 ">
            <MessageInput
              input={input}
              onInputChange={onInputChange}
              onKeyDown={onKeyDown}
              onSubmit={onSubmit}
              disabled={disabled}
              placeholder={placeholder}
              selectedModel={selectedModel}
              onModelChange={onModelChange}
            />
          </div>
        </div>
      </div>
      {showBanner && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50">
          <RemainingLimitBanner
            remaining={remaining}
            limitReached={limitReached}
            onClose={onBannerClose}
          />
        </div>
      )}
    </>
  );
}
