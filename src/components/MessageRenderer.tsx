"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast } from "sonner";

interface MessageRendererProps {
  content: string;
}

interface CodeBlockProps {
  className?: string;
  children: React.ReactNode;
}

function CodeBlock({ className, children }: CodeBlockProps) {
  // Extract language from className (e.g., "language-typescript" -> "typescript")
  const language = className?.replace("language-", "") || "text";
  const codeContent = String(children).replace(/\n$/, "");
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeContent);
      setCopied(true);

      // Show toast notification
      toast.success("Copied to clipboard!", {
        duration: 2000,
      });

      // Reset the copied state after animation
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
      toast.error("Failed to copy code to clipboard");
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg mb-4 overflow-hidden shadow-md w-full">
      {/* Language header with copy button */}
      <div className="bg-gray-100 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600 lowercase">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
          title="Copy code"
        >
          {copied ? (
            // Checkmark icon for copied state
            <svg
              className="w-3.5 h-3.5 text-green-600 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            // Clipboard icon for default state
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          )}
          <span className={copied ? "text-green-600" : ""}>
            {copied ? "Copied!" : "Copy"}
          </span>
        </button>
      </div>
      {/* Code content with syntax highlighting */}
      <SyntaxHighlighter
        language={language}
        style={oneLight}
        customStyle={{
          margin: 0,
          padding: "16px",
          backgroundColor: "#f8f9fa",
          fontSize: "12px",
          lineHeight: "1.5",
          width: "100%",
        }}
        wrapLongLines={true}
      >
        {codeContent}
      </SyntaxHighlighter>
    </div>
  );
}

export default function MessageRenderer({ content }: MessageRendererProps) {
  return (
    <div className="w-full">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="text-sm text-gray-800 leading-relaxed mb-4 mx-0">
              {children}
            </p>
          ),
          h1: ({ children }) => (
            <h1 className="text-lg font-semibold text-gray-900 mb-4 mt-6 mx-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-semibold text-gray-900 mb-3 mt-5 mx-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-gray-900 mb-2 mt-4 mx-0">
              {children}
            </h3>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-6 mb-4 space-y-2 mx-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 mb-4 space-y-2 mx-0">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-sm text-gray-800 leading-relaxed">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-l-gray-300 pl-4 italic text-gray-700 mb-4 mx-0">
              {children}
            </blockquote>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900">{children}</strong>
          ),
          code: (props: React.ComponentProps<"code">) => {
            const { className, children, ...rest } = props;
            const isInline = !className || !className.includes("language-");

            if (isInline) {
              return (
                <code
                  className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-800"
                  {...rest}
                >
                  {children}
                </code>
              );
            }

            return <CodeBlock className={className}>{children}</CodeBlock>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
