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
    console.log("🔄 [LOGIC] Converting Convex messages to UI format:", {
      hasUser: !!user,
      hasConvexMessages: !!convexMessages,
      messageCount: convexMessages?.length || 0,
    });

    if (!user || !convexMessages) {
      console.log("⚠️ [LOGIC] No user or messages, returning empty array");
      return [];
    }

    // 🔍 DEBUG: Log raw Convex messages structure
    console.log(
      "📨 [LOGIC] Raw Convex messages:",
      convexMessages.map((msg) => ({
        id: msg._id,
        role: msg.role,
        bodyLength: msg.body.length,
        bodyPreview: msg.body.substring(0, 50) + "...",
        hasToolCallId: !!msg.toolCallId,
        toolName: msg.toolName,
        hasToolArgs: !!msg.toolArgs,
        hasToolResult: !!msg.toolResult,
        hasParts: !!msg.parts?.length,
        partsCount: msg.parts?.length || 0,
      }))
    );

    // Filter out raw tool result messages; they will be merged into the assistant's
    // tool-call message part.
    const messagesToRender = convexMessages.filter(
      (msg) => msg.role !== "tool"
    );

    const converted = messagesToRender
      // No longer need to reconstruct from flattened columns.
      // The `parts` array from the database is now the source of truth.
      .map((msg) => {
        const uiMessage: Message = {
          id: msg._id,
          role: msg.role as "user" | "assistant",
          content: msg.body,
          createdAt: new Date(msg._creationTime),
          parts: undefined,
        };

        if (msg.parts && msg.parts.length > 0) {
          // Find the tool call and result parts from the database message history.
          // Note: This assumes a simplified flow where one assistant message
          // has a tool call and a subsequent message has the result.
          const toolCallPart = msg.parts.find((p) => p.type === "tool-call");
          if (toolCallPart) {
            const toolResultPart = convexMessages
              .flatMap((m) => m.parts || [])
              .find(
                (p) =>
                  p.type === "tool-result" &&
                  p.toolCallId === toolCallPart.toolCallId
              );

            uiMessage.content = ""; // Clear body for tool messages
            uiMessage.parts = [
              {
                type: "tool-invocation",
                toolInvocation: {
                  toolCallId: toolCallPart.toolCallId,
                  toolName: toolCallPart.toolName,
                  args: toolCallPart.args,
                  state: toolResultPart ? "result" : "call",
                  result: toolResultPart ? toolResultPart.result : undefined,
                },
              },
            ] as Message["parts"];
          }
        }
        return uiMessage;
      });

    console.log("✅ [LOGIC] Final converted messages:", {
      count: converted.length,
      summary: converted.map((msg) => ({
        id: msg.id,
        role: msg.role,
        hasContent: !!msg.content,
        hasParts: !!msg.parts?.length,
        partsCount: msg.parts?.length || 0,
      })),
    });

    return converted;
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
