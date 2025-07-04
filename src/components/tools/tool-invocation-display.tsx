import React from "react";
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Code,
  Database,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ToolInvocationDisplayProps {
  toolName: string;
  args?: Record<string, unknown>;
  state: "call" | "result" | "error";
  result?: Record<string, unknown>;
  error?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  timestamp?: number | Date;
}

const getToolIcon = (toolName: string) => {
  switch (toolName) {
    case "getTodos":
    case "displayTodosUI":
      return <Database className="w-4 h-4" />;
    case "createTodo":
    case "updateTodo":
    case "deleteTodo":
      return <Wrench className="w-4 h-4" />;
    default:
      return <Code className="w-4 h-4" />;
  }
};

const getStatusIcon = (state: string) => {
  switch (state) {
    case "call":
      return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
    case "result":
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case "error":
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    default:
      return <Clock className="w-4 h-4 text-gray-400" />;
  }
};

const getStatusColor = (state: string) => {
  switch (state) {
    case "call":
      return "border-blue-200 bg-blue-50";
    case "result":
      return "border-green-200 bg-green-50";
    case "error":
      return "border-red-200 bg-red-50";
    default:
      return "border-gray-200 bg-gray-50";
  }
};

const formatTimestamp = (timestamp?: number | Date) => {
  if (!timestamp) return null;
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
};

const formatArguments = (args: Record<string, unknown> | undefined) => {
  if (!args || typeof args !== "object") return String(args || "none");

  try {
    return JSON.stringify(args, null, 2);
  } catch {
    return String(args);
  }
};

const formatResult = (result: Record<string, unknown> | undefined) => {
  if (!result) return "No result";

  if (typeof result === "object") {
    try {
      return JSON.stringify(result, null, 2);
    } catch {
      return String(result);
    }
  }

  return String(result);
};

export const ToolInvocationDisplay: React.FC<ToolInvocationDisplayProps> = ({
  toolName,
  args,
  state,
  result,
  error,
  isExpanded = false,
  onToggleExpand,
  timestamp,
}) => {
  const [internalExpanded, setInternalExpanded] = React.useState(false);
  const isControlled = onToggleExpand !== undefined;
  const expanded = isControlled ? isExpanded : internalExpanded;

  const handleToggle = () => {
    if (isControlled) {
      onToggleExpand?.();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  const getStatusText = () => {
    switch (state) {
      case "call":
        return "Executing...";
      case "result":
        return "Completed";
      case "error":
        return "Failed";
      default:
        return "Unknown";
    }
  };

  const formattedTime = formatTimestamp(timestamp);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`border rounded-lg shadow-sm transition-all duration-200 ${getStatusColor(
        state
      )}`}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/50 transition-colors"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {getToolIcon(toolName)}
            <span className="font-medium text-gray-900">{toolName}</span>
          </div>

          <div className="flex items-center gap-1 text-sm">
            {getStatusIcon(state)}
            <span
              className={`font-medium ${
                state === "call"
                  ? "text-blue-700"
                  : state === "result"
                  ? "text-green-700"
                  : state === "error"
                  ? "text-red-700"
                  : "text-gray-700"
              }`}
            >
              {getStatusText()}
            </span>
          </div>

          {formattedTime && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              {formattedTime}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {state === "call" && (
            <div className="flex items-center gap-1 text-sm text-blue-600">
              <span>Processing</span>
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" />
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse [animation-delay:0.2s]" />
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse [animation-delay:0.4s]" />
              </div>
            </div>
          )}

          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </div>

      {/* Expandable Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-200/60 overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Arguments Section */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Arguments
                </h4>
                <div className="bg-white/80 border border-gray-200 rounded-md p-3">
                  <pre className="text-sm text-gray-700 font-mono whitespace-pre-wrap break-words">
                    {formatArguments(args)}
                  </pre>
                </div>
              </div>

              {/* Result/Error Section */}
              {(state === "result" || state === "error") && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    {state === "error" ? (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        Error Details
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Result
                      </>
                    )}
                  </h4>
                  <div
                    className={`border rounded-md p-3 ${
                      state === "error"
                        ? "bg-red-50/80 border-red-200"
                        : "bg-white/80 border-gray-200"
                    }`}
                  >
                    <pre
                      className={`text-sm font-mono whitespace-pre-wrap break-words ${
                        state === "error" ? "text-red-700" : "text-gray-700"
                      }`}
                    >
                      {state === "error"
                        ? error || "Unknown error"
                        : formatResult(result)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Execution Info */}
              <div className="text-xs text-gray-500 border-t pt-3">
                <div className="flex items-center justify-between">
                  <span>Tool execution details</span>
                  <span>State: {state}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
