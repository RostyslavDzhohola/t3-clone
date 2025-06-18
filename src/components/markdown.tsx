import Link from "next/link";
import React, { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "@/components/code-block";

const components: Partial<Components> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  code: (props: any) => {
    const { inline, className, children, ...rest } = props;
    // For inline code, just return a simple code element
    if (inline) {
      return <code {...rest}>{children}</code>;
    }
    // For block code, pass through to CodeBlock
    return (
      <CodeBlock inline={false} className={className} {...rest}>
        {children}
      </CodeBlock>
    );
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pre: ({ children }: any) => {
    // Just return children - CodeBlock will handle the pre wrapper
    return children;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  p: ({ children, ...props }: any) => {
    // Check if this paragraph only contains a code block
    if (React.Children.count(children) === 1) {
      const childArray = React.Children.toArray(children);
      const child = childArray[0];
      if (React.isValidElement(child) && child.type === CodeBlock) {
        // Return the code block directly without the paragraph wrapper
        return child;
      }
    }
    // Regular paragraph with improved spacing
    return (
      <p className="mb-3 last:mb-0 leading-loose" {...props}>
        {children}
      </p>
    );
  },

  ol: ({ children, ...props }) => {
    return (
      <ol className="list-decimal list-outside ml-7 space-y-1 mb-4" {...props}>
        {children}
      </ol>
    );
  },
  li: ({ children, ...props }) => {
    return (
      <li className="leading-relaxed" {...props}>
        {children}
      </li>
    );
  },
  ul: ({ children, ...props }) => {
    return (
      <ul className="list-disc list-outside ml-6 space-y-1 mb-4" {...props}>
        {children}
      </ul>
    );
  },
  strong: ({ children, ...props }) => {
    return (
      <span className="font-semibold" {...props}>
        {children}
      </span>
    );
  },
  a: ({ children, ...props }) => {
    return (
      // @ts-expect-error - Link props don't match anchor props exactly
      <Link
        className="text-blue-500 hover:text-blue-600 hover:underline transition-colors duration-150"
        target="_blank"
        rel="noreferrer"
        {...props}
      >
        {children}
      </Link>
    );
  },
  h1: ({ children, ...props }) => {
    return (
      <h1
        className="text-2xl font-bold mt-8 mb-4 first:mt-0 leading-tight"
        {...props}
      >
        {children}
      </h1>
    );
  },
  h2: ({ children, ...props }) => {
    return (
      <h2
        className="text-xl font-bold mt-6 mb-3 first:mt-0 leading-tight"
        {...props}
      >
        {children}
      </h2>
    );
  },
  h3: ({ children, ...props }) => {
    return (
      <h3
        className="text-lg font-semibold mt-5 mb-2 first:mt-0 leading-tight"
        {...props}
      >
        {children}
      </h3>
    );
  },
  h4: ({ children, ...props }) => {
    return (
      <h4
        className="text-base font-semibold mt-4 mb-2 first:mt-0 leading-tight"
        {...props}
      >
        {children}
      </h4>
    );
  },
  h5: ({ children, ...props }) => {
    return (
      <h5
        className="text-sm font-semibold mt-4 mb-2 first:mt-0 leading-tight"
        {...props}
      >
        {children}
      </h5>
    );
  },
  h6: ({ children, ...props }) => {
    return (
      <h6
        className="text-xs font-semibold mt-3 mb-2 first:mt-0 leading-tight uppercase tracking-wide"
        {...props}
      >
        {children}
      </h6>
    );
  },
  blockquote: ({ children, ...props }) => {
    return (
      <blockquote
        className="border-l-4 border-gray-300 pl-4 py-2 my-4 italic bg-gray-50 rounded-r"
        {...props}
      >
        {children}
      </blockquote>
    );
  },
  hr: ({ ...props }) => {
    return <hr className="my-6 border-gray-200" {...props} />;
  },
  table: ({ children, ...props }) => {
    return (
      <div className="overflow-x-auto my-4">
        <table
          className="min-w-full border-collapse border border-gray-200"
          {...props}
        >
          {children}
        </table>
      </div>
    );
  },
  th: ({ children, ...props }) => {
    return (
      <th
        className="border border-gray-200 px-3 py-2 bg-gray-100 font-semibold text-left"
        {...props}
      >
        {children}
      </th>
    );
  },
  td: ({ children, ...props }) => {
    return (
      <td className="border border-gray-200 px-3 py-2" {...props}>
        {children}
      </td>
    );
  },
};

const remarkPlugins = [remarkGfm];

interface MarkdownProps {
  children: string;
  className?: string;
}

const NonMemoizedMarkdown = ({ children, className = "" }: MarkdownProps) => {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children
);
