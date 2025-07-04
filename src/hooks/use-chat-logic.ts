import { useState, useRef, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { type Message } from "@ai-sdk/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  getDefaultModel,
  getAvailableModels,
  type LLMModel,
} from "@/lib/models";
import { MODEL_STORAGE_KEY } from "@/lib/constants";
import {
  generateChatTitle,
  setStringInStorage,
  getStringFromStorage,
} from "@/lib/chatHelpers";

interface ChatLogicOptions {
  chatId?: string;
}

export function useChatLogic({ chatId }: ChatLogicOptions) {
  const { user } = useUser();

  // Model selection state
  const [selectedModel, setSelectedModel] = useState<LLMModel>(() => {
    if (typeof window !== "undefined") {
      const stored = getStringFromStorage(MODEL_STORAGE_KEY);
      if (stored) {
        try {
          const parsedModel = JSON.parse(stored) as LLMModel;
          const availableModels = getAvailableModels();
          const isValidModel = availableModels.some(
            (m: LLMModel) => m.id === parsedModel.id
          );
          if (isValidModel) {
            return parsedModel;
          }
        } catch {
          // Ignore parsing errors and fall back to default
        }
      }
    }
    return getDefaultModel();
  });

  // AI message processing state
  const lastProcessedAiMessageId = useRef<string | null>(null);

  // Convex mutations (only need updateChatTitle now)
  const updateChatTitle = useMutation(api.messages.updateChatTitle);

  // Load messages from Convex for authenticated users
  const convexMessages = useQuery(
    api.messages.getMessages,
    user && chatId && typeof chatId === "string" && chatId.length > 10
      ? { chatId: chatId as Id<"chats"> }
      : "skip"
  );

  // Convert Convex messages to useChat format
  const convertedMessages: Message[] = useMemo(() => {
    return user && convexMessages
      ? convexMessages
          .filter((msg) => msg.role !== "tool") // Filter out tool result messages
          .map((msg) => {
            const baseMessage: Message = {
              id: msg._id,
              role: msg.role as "user" | "assistant",
              content: msg.body,
              createdAt: new Date(msg._creationTime),
            };

            // 🔥 NEW PATTERN: Reconstruct tool invocations from database structure
            if (msg.role === "assistant" && msg.toolCallId && msg.toolName) {
              // This is a tool call message - convert to AI SDK tool invocation format
              baseMessage.parts = [
                {
                  type: "tool-invocation" as const,
                  toolInvocation: {
                    toolCallId: msg.toolCallId,
                    toolName: msg.toolName,
                    args: msg.toolArgs || {},
                    state: "call" as const,
                  },
                },
              ];

              // Look for the corresponding tool result in the next messages
              const toolResultMessage = convexMessages.find(
                (resultMsg) =>
                  resultMsg.role === "tool" &&
                  resultMsg.toolCallId === msg.toolCallId
              );

              if (toolResultMessage) {
                // Add the result to the tool invocation
                baseMessage.parts.push({
                  type: "tool-invocation" as const,
                  toolInvocation: {
                    toolCallId: msg.toolCallId,
                    toolName: msg.toolName,
                    args: msg.toolArgs || {},
                    state: "result" as const,
                    result: toolResultMessage.toolResult,
                  },
                });
              }
            }

            // 🔄 BACKWARDS COMPATIBILITY: Handle legacy parts format
            else if (msg.parts?.length) {
              baseMessage.parts = msg.parts
                .map(
                  (part: {
                    type: string;
                    toolCallId?: string;
                    toolName?: string;
                    args?: Record<string, unknown>;
                    result?: Record<string, unknown>;
                  }) => {
                    if (part.type === "tool-call") {
                      return {
                        type: "tool-invocation" as const,
                        toolInvocation: {
                          toolCallId: part.toolCallId || "",
                          toolName: part.toolName || "",
                          args: part.args || {},
                          state: "call" as const,
                        },
                      };
                    } else if (part.type === "tool-result") {
                      return {
                        type: "tool-invocation" as const,
                        toolInvocation: {
                          toolCallId: part.toolCallId || "",
                          toolName: part.toolName || "",
                          args: {},
                          state: "result" as const,
                          result: part.result,
                        },
                      };
                    }
                    // Filter out unrecognized legacy parts
                    return null;
                  }
                )
                .filter(
                  (part): part is NonNullable<typeof part> => part !== null
                );
            }

            return baseMessage;
          })
      : [];
  }, [user, convexMessages]);

  // Handle AI message finish callback
  const handleAiMessageFinish = async (message: Message) => {
    // Server now handles saving for authenticated users
    if (!user) {
      if (lastProcessedAiMessageId.current === message.id) {
        return;
      }
      lastProcessedAiMessageId.current = message.id;
    }
  };

  // Enhanced submit handler
  const createEnhancedSubmit = (
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void,
    append: (message: {
      role: "user";
      content: string;
    }) => Promise<string | null | undefined>,
    input: string,
    setInput: (value: string) => void,
    messages: Message[]
  ) => {
    return async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (user) {
        // Server will handle message saving
        // Just handle chat title update if first message
        if (
          chatId &&
          typeof chatId === "string" &&
          chatId.length > 10 &&
          messages.length === 0 &&
          input.trim()
        ) {
          try {
            const title = generateChatTitle(input);
            await updateChatTitle({
              chatId: chatId as Id<"chats">,
              title,
            });
          } catch (error) {
            console.error("Failed to update chat title:", error);
          }
        }

        handleSubmit(e);
      } else {
        if (!input.trim()) return;

        await append({
          role: "user",
          content: input,
        });

        setInput("");
      }
    };
  };

  // Handle model change
  const handleModelChange = (model: LLMModel) => {
    setSelectedModel(model);

    if (user) {
      setStringInStorage(MODEL_STORAGE_KEY, JSON.stringify(model));
    }
  };

  return {
    // State
    selectedModel,
    convertedMessages,

    // Functions
    handleAiMessageFinish,
    createEnhancedSubmit,
    handleModelChange,
  };
}
