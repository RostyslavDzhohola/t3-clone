import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import useSWR from "swr";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { Message } from "@ai-sdk/react";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";

interface UseMessagesOptions {
  /**
   * Chat ID to fetch messages for
   */
  chatId?: string;
  /**
   * Whether to enable real-time updates
   */
  realtime?: boolean;
  /**
   * SWR revalidation interval in milliseconds
   */
  refreshInterval?: number;
  /**
   * Whether to use anonymous mode (local storage)
   */
  anonymous?: boolean;
  /**
   * Anonymous chat data for local storage
   */
  anonymousChat?: {
    id: string;
    messages: Message[];
  } | null;
}

interface UseMessagesReturn {
  /** Array of messages for display */
  messages: Message[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Whether data is validating/refreshing */
  isValidating: boolean;
  /** Function to manually refresh messages */
  refresh: () => Promise<void>;
  /** Function to add optimistic message */
  addOptimisticMessage: (message: Message) => void;
  /** Function to remove optimistic message */
  removeOptimisticMessage: (messageId: string) => void;
  /** Function to update a specific message */
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  /** Total message count */
  messageCount: number;
}

// Helper function to convert Convex messages to AI SDK format
function convertConvexMessage(convexMessage: any, index: number): Message {
  return {
    id: convexMessage._id || `msg-${index}`,
    role: convexMessage.role as "user" | "assistant",
    content: convexMessage.body,
    createdAt: new Date(convexMessage._creationTime),
  };
}

// SWR fetcher for Convex data
async function fetchConvexMessages(
  chatId: string,
  convexQuery: any
): Promise<Message[]> {
  if (!chatId || !convexQuery) return [];

  try {
    const convexMessages = await convexQuery;
    return convexMessages?.map(convertConvexMessage) || [];
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
}

export function useMessages({
  chatId,
  realtime = true,
  refreshInterval = 0, // Disabled by default for real-time mode
  anonymous = false,
  anonymousChat = null,
}: UseMessagesOptions = {}): UseMessagesReturn {
  // Optimistic messages state (for immediate UI updates)
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);

  // Convex real-time query for authenticated users
  const convexMessages = useQuery(
    api.messages.getMessages,
    chatId && !anonymous ? { chatId: chatId as Id<"chats"> } : "skip"
  );

  // SWR for enhanced caching and revalidation
  const swrKey = anonymous
    ? `anonymous-${anonymousChat?.id}`
    : `messages-${chatId}`;

  const {
    data: swrMessages,
    error,
    isLoading,
    isValidating,
    mutate: swrMutate,
  } = useSWR<Message[]>(
    chatId || anonymousChat ? swrKey : null,
    async () => {
      if (anonymous && anonymousChat) {
        // For anonymous users, return messages from local storage
        return anonymousChat.messages || [];
      } else if (chatId && convexMessages !== undefined) {
        // For authenticated users, use Convex data
        return convexMessages?.map(convertConvexMessage) || [];
      }
      return [];
    },
    {
      refreshInterval: realtime ? refreshInterval : 5000, // Auto-refresh for better UX
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 1000, // Dedupe requests within 1 second
      errorRetryCount: 3,
      errorRetryInterval: 1000,
    }
  );

  // Combine SWR data with Convex real-time updates
  const [finalMessages, setFinalMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (anonymous && anonymousChat) {
      // For anonymous users, use local storage data
      setFinalMessages(anonymousChat.messages || []);
    } else if (!anonymous && convexMessages !== undefined) {
      // For authenticated users, prefer real-time Convex data
      const converted = convexMessages?.map(convertConvexMessage) || [];
      setFinalMessages(converted);

      // Update SWR cache with latest Convex data
      swrMutate(converted, false);
    } else if (swrMessages) {
      // Fallback to SWR cached data
      setFinalMessages(swrMessages);
    }
  }, [anonymous, anonymousChat, convexMessages, swrMessages, swrMutate]);

  // Merge optimistic messages with final messages
  const allMessages = [...finalMessages, ...optimisticMessages];

  // Helper functions
  const refresh = async () => {
    await swrMutate();
  };

  const addOptimisticMessage = (message: Message) => {
    setOptimisticMessages((prev) => [...prev, message]);
  };

  const removeOptimisticMessage = (messageId: string) => {
    setOptimisticMessages((prev) => prev.filter((msg) => msg.id !== messageId));
  };

  const updateMessage = (messageId: string, updates: Partial<Message>) => {
    // Update in optimistic messages
    setOptimisticMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, ...updates } : msg))
    );

    // Update in SWR cache
    if (swrMessages) {
      const updatedMessages = swrMessages.map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      );
      swrMutate(updatedMessages, false);
    }
  };

  return {
    messages: allMessages,
    isLoading: isLoading && !finalMessages.length,
    error,
    isValidating,
    refresh,
    addOptimisticMessage,
    removeOptimisticMessage,
    updateMessage,
    messageCount: allMessages.length,
  };
}
