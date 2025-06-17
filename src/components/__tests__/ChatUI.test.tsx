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
      clearAnonymousData: vi.fn(),
    }));
  });

  it("should ignore duplicate onFinish calls with the same message ID", async () => {
    let onFinishCallback: ((message: Message) => Promise<void>) | undefined;

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

    render(<ChatUI />);

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

    // Mock console.log to track calls
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Call onFinish first time
    await onFinishCallback!(testMessage as Message);

    // Call onFinish second time with same message ID
    await onFinishCallback!(testMessage as Message);

    // Call onFinish third time with same message ID
    await onFinishCallback!(testMessage as Message);

    // Should only log the message processing once
    const processedLogs = consoleSpy.mock.calls.filter((call) =>
      call[0]?.includes("🎯 onFinish called with message:")
    );

    expect(processedLogs).toHaveLength(1);

    consoleSpy.mockRestore();
  });

  it("should process different message IDs separately", async () => {
    let onFinishCallback: ((message: Message) => Promise<void>) | undefined;

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

    render(<ChatUI />);

    await waitFor(() => {
      expect(onFinishCallback).toBeDefined();
    });

    const firstMessage = {
      id: "ai-msg-1",
      role: "assistant",
      content: "First response",
      createdAt: new Date(),
    };

    const secondMessage = {
      id: "ai-msg-2",
      role: "assistant",
      content: "Second response",
      createdAt: new Date(),
    };

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Call onFinish with first message
    await onFinishCallback!(firstMessage as Message);

    // Call onFinish with second message (different ID)
    await onFinishCallback!(secondMessage as Message);

    // Should process both messages
    const processedLogs = consoleSpy.mock.calls.filter((call) =>
      call[0]?.includes("🎯 onFinish called with message:")
    );

    expect(processedLogs).toHaveLength(2);

    consoleSpy.mockRestore();
  });
});
