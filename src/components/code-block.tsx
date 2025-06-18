"use client";

import { useDeferredValue, memo, useState } from "react";
import { Highlight, themes, Prism } from "prism-react-renderer";
import { CopyButton } from "@/components/copy-button";
import { TextWrapButton } from "@/components/text-wrap-button";

// Load all available languages from PrismJS
(typeof global !== "undefined" ? global : window).Prism = Prism;

// Load essential additional languages
// eslint-disable-next-line @typescript-eslint/no-require-imports
const loadLanguages = require("prismjs/components/index");

// Load comprehensive language support (sorted alphabetically)
try {
  loadLanguages([
    // Web technologies
    "css",
    "html",
    "javascript",
    "typescript",
    "json",
    "markdown",

    // Compiled languages
    "c",
    "cpp",
    "csharp",
    "go",
    "java",
    "kotlin",
    "rust",
    "swift",

    // Dynamic/interpreted languages
    "python",
    "ruby",
    "php",
    "perl",
    "lua",
    "r",

    // Functional languages
    "clojure",
    "elixir",
    "erlang",
    "haskell",
    "julia",
    "scala",

    // JVM languages
    "groovy",

    // Shell and system
    "bash",
    "powershell",
    "batch",

    // Config and data
    "yaml",
    "toml",
    "ini",
    "properties",
    "xml",

    // Database
    "sql",
    "plsql",

    // DevOps and infrastructure
    "docker",
    "dockerfile",
    "nginx",

    // Build tools
    "makefile",
    "cmake",
    "gradle",

    // Other common languages
    "diff",
    "git",
    "regex",
    "latex",
    "graphql",
    "protobuf",
  ]);
} catch (error) {
  console.warn("Error loading additional Prism languages:", error);
}

interface CodeBlockProps {
  node?: unknown;
  inline: boolean;
  className?: string;
  children: React.ReactNode;
}

export const CodeBlock = memo(function CodeBlock({
  inline,
  className = "",
  children,
  ...props
}: CodeBlockProps) {
  // Extract language and code content (always, regardless of inline)
  const match = /language-(\w+)/.exec(className);
  const language = match ? match[1] : "text";
  const codeContent = String(children).replace(/\n$/, "");

  // State for text wrapping
  const [isWrapped, setIsWrapped] = useState(false);

  // 🚀 PERFORMANCE FIX: Defer the code content for tokenization
  // This prevents main thread blocking during streaming
  const deferredCodeContent = useDeferredValue(codeContent);

  if (!inline) {
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
        {/* Header with language and buttons - made darker */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-100 border-b border-gray-300">
          {/* Scrollable language label - made lowercase */}
          <div className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap block pr-4">
              {language.toLowerCase()}
            </span>
          </div>

          {/* Button group */}
          <div className="flex items-center gap-1">
            <TextWrapButton
              isWrapped={isWrapped}
              onToggle={() => setIsWrapped(!isWrapped)}
            />
            <CopyButton text={codeContent} />
          </div>
        </div>

        {/* Code content with syntax highlighting */}
        <div className="relative">
          <Highlight
            theme={themes.oneLight}
            code={deferredCodeContent}
            language={language === "shell" ? "bash" : language}
            prism={Prism}
          >
            {({ className, style, tokens, getLineProps, getTokenProps }) => (
              <pre
                className={className}
                style={{
                  ...style,
                  margin: 0,
                  borderRadius: 0,
                  fontSize: "0.875rem",
                  lineHeight: "1.6",
                  padding: "1rem",
                  background: "#fafafa",
                  fontFamily:
                    'ui-monospace, SFMono-Regular, "SF Mono", monospace',
                  whiteSpace: isWrapped ? "pre-wrap" : "pre",
                  overflowX: isWrapped ? "visible" : "auto",
                }}
                {...props}
              >
                {tokens.map((line, i) => (
                  <div key={i} {...getLineProps({ line })}>
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </div>
                ))}
              </pre>
            )}
          </Highlight>
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
});
