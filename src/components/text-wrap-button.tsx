"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TextWrapButtonProps {
  isWrapped: boolean;
  onToggle: () => void;
}

export function TextWrapButton({ isWrapped, onToggle }: TextWrapButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onToggle}
          className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-transparent hover:bg-gray-200 transition-colors duration-200 group"
          aria-label={
            isWrapped ? "Disable text wrapping" : "Enable text wrapping"
          }
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            className="text-gray-500 group-hover:text-gray-700"
          >
            {isWrapped ? (
              // Unwrap icon - three left-aligned lines (short, full, short)
              <>
                <path
                  d="M3 6h12M3 12h18M3 18h12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </>
            ) : (
              // Wrap icon - curved line indicating text wrapping
              <>
                <path
                  d="M3 6h18M3 12h15a3 3 0 1 1 0 6h-4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="m16 16-2 2 2 2M3 18h7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}
          </svg>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {isWrapped ? "Disable text wrapping" : "Enable text wrapping"}
      </TooltipContent>
    </Tooltip>
  );
}
