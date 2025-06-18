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

    // Render plain text blocks with minimal styling (no header, no copy button)
    const isPlainText = ["text", "plaintext", "txt"].includes(language);

    if (isPlainText) {
      const isSingleLine = !codeContent.includes("\n");
      const shouldInline = isSingleLine && codeContent.length <= 60;

      // Treat very small snippets as inline to keep markdown flow smooth
      if (shouldInline) {
        return (
          <code
            className="bg-gray-100 px-1.5 py-0.5 rounded-md text-sm font-mono text-gray-800 border border-gray-200"
            {...props}
          >
            {codeContent}
          </code>
        );
      }

      // Otherwise render as a minimal block
      return (
        <pre
          className="my-4 overflow-x-auto rounded-md bg-gray-100 p-4 text-sm font-mono text-gray-800 border border-gray-200"
          {...props}
        >
          {codeContent}
        </pre>
      );
    }

    return (
      <div className="my-6 overflow-hidden rounded-lg border border-gray-200 shadow-sm">
        {/* Header with language and copy button */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-600 capitalize">
            {language}
          </span>
          <CopyButton text={codeContent} />
        </div>

        {/* Code content with syntax highlighting */}
        <div className="relative">
          <SyntaxHighlighter
            language={language}
            style={oneLight}
            customStyle={{
              margin: 0,
              borderRadius: 0,
              fontSize: "0.875rem",
              lineHeight: "1.6",
              padding: "1rem",
              background: "#fafafa",
            }}
            showLineNumbers={false}
            wrapLines={true}
            {...props}
          >
            {codeContent}
          </SyntaxHighlighter>
        </div>
      </div>
    );
  } else {
    return (
      <code
        className="bg-gray-100 px-1.5 py-0.5 rounded-md text-sm font-mono text-gray-800 border border-gray-200"
        {...props}
      >
        {children}
      </code>
    );
  }
}
