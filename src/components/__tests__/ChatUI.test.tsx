import { render, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ChatUI } from "@/components";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useChat } from "@ai-sdk/react";
import { type Message } from "@ai-sdk/react";

// Mock all dependencies
vi.mock("@clerk/nextjs");
vi.mock("convex/react");
vi.mock("@ai-sdk/react");
vi.mock("next/navigation");
vi.mock("../hooks");
vi.mock("../../lib/models");
vi.mock("../../lib/chatHelpers");
vi.mock("sonner");

const mockUseUser = vi.mocked(useUser);
const mockUseMutation = vi.mocked(useMutation);
const mockUseQuery = vi.mocked(useQuery);
const mockUseChat = vi.mocked(useChat);

describe("ChatUI onFinish callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock localStorage
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });

    // Default mocks
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: true,
      isSignedIn: false,
    });
    mockUseMutation.mockReturnValue(
      vi.fn() as unknown as ReturnType<typeof useMutation>
    );
    mockUseQuery.mockReturnValue(undefined);

    // Mock useChat hook
    mockUseChat.mockReturnValue({
      messages: [],
      input: "",
      handleInputChange: vi.fn(),
      handleSubmit: vi.fn(),
      status: "ready",
      setMessages: vi.fn(),
      append: vi.fn(),
      setInput: vi.fn(),
    } as unknown as ReturnType<typeof useChat>);

    // Mock hooks
    vi.mock("../hooks", () => ({
      useChatNavigation: vi.fn(() => ({
        currentChatId: null,
        handleChatSelect: vi.fn(),
      })),
      useMessageInput: vi.fn(() => ({
        handleInputChangeWithAutoCreate: vi.fn(),
        onSubmit: vi.fn(),
      })),
    }));

    // Mock models
    vi.mock("../../lib/models", () => ({
      getDefaultModel: vi.fn(() => ({ id: "test-model", name: "Test Model" })),
      getDefaultAnonymousModel: vi.fn(() => ({
        id: "gemini-2.0-flash-exp",
        name: "Gemini 2.0 Flash",
      })),
      getAvailableModels: vi.fn(() => []),
      isModelAvailableForAnonymous: vi.fn(() => true),
    }));

    // Mock chat helpers
    vi.mock("../../lib/chatHelpers", () => ({
      generateChatTitle: vi.fn(() => "Test Chat"),
      createUserMessage: vi.fn((content) => ({
        id: "user-msg-1",
        role: "user",
        content,
        createdAt: new Date(),
      })),
      generateAnonymousChatId: vi.fn(() => "anon_123"),
      ANONYMOUS_STORAGE_KEYS: {
        MESSAGE_COUNT: "anon_message_count",
        AI_COUNT: "anon_ai_count",
        CHATS: "anon_chats",
        CURRENT_CHAT: "anon_current_chat",
      },
      isAnonymousLimitReached: vi.fn(() => false),
      getNumberFromStorage: vi.fn(() => 0),
      setNumberInStorage: vi.fn(),
      getObjectFromStorage: vi.fn(() => []),
      setObjectInStorage: vi.fn(),
      getStringFromStorage: vi.fn(() => ""),
      setStringInStorage: vi.fn(),
      clearAnonymousData: vi.fn(),
    }));
  });

  it("should handle onFinish for anonymous users", async () => {
    let onFinishCallback: ((message: Message) => Promise<void>) | undefined;
    const mockAddMessageToAnonymousChat = vi.fn();
    const mockOnAnonymousAiMessageUpdate = vi.fn();

    // Mock useChat to capture the onFinish callback
    mockUseChat.mockImplementation((options: unknown) => {
      onFinishCallback = (
        options as { onFinish?: (message: Message) => Promise<void> }
      )?.onFinish;
      return {
        messages: [],
        input: "",
        handleInputChange: vi.fn(),
        handleSubmit: vi.fn(),
        status: "ready",
        setMessages: vi.fn(),
        append: vi.fn(),
        setInput: vi.fn(),
      } as unknown as ReturnType<typeof useChat>;
    });

    render(
      <ChatUI
        addMessageToAnonymousChat={mockAddMessageToAnonymousChat}
        onAnonymousAiMessageUpdate={mockOnAnonymousAiMessageUpdate}
        currentAnonymousChat={{
          id: "anon_123",
          title: "Test Chat",
          messages: [],
          createdAt: Date.now(),
        }}
      />
    );

    // Wait for component to render and capture onFinish
    await waitFor(() => {
      expect(onFinishCallback).toBeDefined();
    });

    const testMessage = {
      id: "ai-msg-123",
      role: "assistant",
      content: "Test response",
      createdAt: new Date(),
    };

    // Call onFinish for anonymous user
    await onFinishCallback!(testMessage as Message);

    // Should call the anonymous chat management functions
    expect(mockAddMessageToAnonymousChat).toHaveBeenCalledWith(
      testMessage,
      "anon_123"
    );
    expect(mockOnAnonymousAiMessageUpdate).toHaveBeenCalledWith(1);
  });

  it("should not handle onFinish for authenticated users (server handles it)", async () => {
    let onFinishCallback: ((message: Message) => Promise<void>) | undefined;
    const mockAddMessageToAnonymousChat = vi.fn();
    const mockOnAnonymousAiMessageUpdate = vi.fn();

    // Mock authenticated user
    mockUseUser.mockReturnValue({
      user: { id: "user_123" } as Partial<typeof mockUseUser>,
      isLoaded: true,
      isSignedIn: true,
    } as ReturnType<typeof useUser>);

    // Mock useChat to capture the onFinish callback
    mockUseChat.mockImplementation((options: unknown) => {
      onFinishCallback = (
        options as { onFinish?: (message: Message) => Promise<void> }
      )?.onFinish;
      return {
        messages: [],
        input: "",
        handleInputChange: vi.fn(),
        handleSubmit: vi.fn(),
        status: "ready",
        setMessages: vi.fn(),
        append: vi.fn(),
        setInput: vi.fn(),
      } as unknown as ReturnType<typeof useChat>;
    });

    render(
      <ChatUI
        addMessageToAnonymousChat={mockAddMessageToAnonymousChat}
        onAnonymousAiMessageUpdate={mockOnAnonymousAiMessageUpdate}
        chatId="test_chat_123"
      />
    );

    // Wait for component to render and capture onFinish
    await waitFor(() => {
      expect(onFinishCallback).toBeDefined();
    });

    const testMessage = {
      id: "ai-msg-123",
      role: "assistant",
      content: "Test response",
      createdAt: new Date(),
    };

    // Call onFinish for authenticated user
    await onFinishCallback!(testMessage as Message);

    // Should NOT call anonymous chat management functions for authenticated users
    expect(mockAddMessageToAnonymousChat).not.toHaveBeenCalled();
    expect(mockOnAnonymousAiMessageUpdate).not.toHaveBeenCalled();
  });
});
