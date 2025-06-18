"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { CopyButton } from "@/components/copy-button";

interface CodeBlockProps {
  node?: unknown;
  inline: boolean;
  className?: string;
  children: React.ReactNode;
}

export function CodeBlock({
  inline,
  className = "",
  children,
  ...props
}: CodeBlockProps) {
  if (!inline) {
    // Extract language from className (format: "language-js")
    const match = /language-(\w+)/.exec(className);
    const language = match ? match[1] : "text";

    // Get the code content as string
    const codeContent = String(children).replace(/\n$/, "");

    return (
      <div className="relative my-4 overflow-hidden rounded-lg border border-gray-200">
        {/* Header with language and copy button */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-200 border-b border-gray-300">
          <span className="text-xs font-medium text-gray-600 lowercase tracking-wide">
            {language}
          </span>
          <CopyButton text={codeContent} />
        </div>

        {/* Code content with syntax highlighting */}
        <SyntaxHighlighter
          language={language}
          style={oneLight}
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: "0.875rem",
            lineHeight: "1.5",
          }}
          showLineNumbers={false}
          wrapLines={true}
          {...props}
        >
          {codeContent}
        </SyntaxHighlighter>
      </div>
    );
  } else {
    return (
      <code
        className="text-sm bg-gray-100 text-gray-800 py-1 px-2 rounded-md font-mono border border-gray-200"
        {...props}
      >
        {children}
      </code>
    );
  }
}
