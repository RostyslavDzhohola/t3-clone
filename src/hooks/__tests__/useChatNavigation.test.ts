import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useChatNavigation } from "../useChatNavigation";
import { mockPush } from "../../test/setup";

// Mock Next.js navigation
const mockUsePathname = vi.fn();
vi.mock("next/navigation", async () => {
  const actual = await vi.importActual("next/navigation");
  return {
    ...actual,
    usePathname: () => mockUsePathname(),
    useRouter: () => ({
      push: mockPush,
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    }),
  };
});

// Mock data
const mockUser = { id: "user123" };
const mockChats = [
  { _id: "chat1" as any, title: "First Chat" },
  { _id: "chat2" as any, title: "Second Chat" },
];
const mockAnonymousChats = [
  {
    id: "anon1",
    title: "Anonymous Chat 1",
    messages: [],
    createdAt: Date.now(),
  },
  {
    id: "anon2",
    title: "Anonymous Chat 2",
    messages: [],
    createdAt: Date.now(),
  },
];

describe("useChatNavigation", () => {
  const mockSetMessages = vi.fn();
  const mockSetCurrentAnonymousChat = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/"); // Default to home page
    // Reset localStorage mock
    vi.mocked(localStorage.setItem).mockClear();
    vi.mocked(localStorage.getItem).mockClear();
    // Reset router mock
    mockPush.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should initialize with null currentChatId when not on home page", () => {
      // Ensure we're not on home page and not on chat page
      mockUsePathname.mockReturnValue("/some-other-page");

      const { result } = renderHook(() =>
        useChatNavigation({
          user: mockUser,
          chats: [], // Empty to prevent auto-selection
          anonymousChats: [],
          setMessages: mockSetMessages,
          setCurrentAnonymousChat: mockSetCurrentAnonymousChat,
        })
      );

      // Should be null since we're not on home page and no auto-selection
      expect(result.current.currentChatId).toBeNull();
    });

    it("should provide all expected functions", () => {
      mockUsePathname.mockReturnValue("/some-other-page");

      const { result } = renderHook(() =>
        useChatNavigation({
          user: mockUser,
          chats: [], // Empty to prevent auto-selection
          anonymousChats: [],
          setMessages: mockSetMessages,
          setCurrentAnonymousChat: mockSetCurrentAnonymousChat,
        })
      );

      expect(result.current).toHaveProperty("currentChatId");
      expect(result.current).toHaveProperty("setCurrentChatId");
      expect(result.current).toHaveProperty("handleChatSelect");
      expect(result.current).toHaveProperty("autoSelectFirstChat");
      expect(result.current).toHaveProperty("syncChatFromUrl");
    });
  });

  describe("Chat Selection - Authenticated User", () => {
    it("should handle authenticated user chat selection", () => {
      // Start with no auto-selection (not on home page)
      mockUsePathname.mockReturnValue("/some-other-page");

      const { result } = renderHook(() =>
        useChatNavigation({
          user: mockUser,
          chats: [], // Empty chats to prevent auto-selection
          anonymousChats: [],
          setMessages: mockSetMessages,
          setCurrentAnonymousChat: mockSetCurrentAnonymousChat,
        })
      );

      act(() => {
        result.current.handleChatSelect("chat123456789abc"); // Long enough chat ID (>10 chars)
      });

      expect(result.current.currentChatId).toBe("chat123456789abc");
      expect(mockPush).toHaveBeenCalledWith("/chat/chat123456789abc");
    });

    it("should not handle short chat IDs for authenticated users", () => {
      mockUsePathname.mockReturnValue("/some-other-page");

      const { result } = renderHook(() =>
        useChatNavigation({
          user: mockUser,
          chats: [], // Empty chats to prevent auto-selection
          anonymousChats: [],
          setMessages: mockSetMessages,
          setCurrentAnonymousChat: mockSetCurrentAnonymousChat,
        })
      );

      act(() => {
        result.current.handleChatSelect("short");
      });

      expect(result.current.currentChatId).toBeNull();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("Chat Selection - Anonymous User", () => {
    it("should handle anonymous user chat selection", () => {
      const { result } = renderHook(() =>
        useChatNavigation({
          user: null,
          chats: undefined,
          anonymousChats: mockAnonymousChats,
          setMessages: mockSetMessages,
          setCurrentAnonymousChat: mockSetCurrentAnonymousChat,
        })
      );

      act(() => {
        result.current.handleChatSelect("anon1");
      });

      expect(result.current.currentChatId).toBe("anon1");
      expect(mockSetCurrentAnonymousChat).toHaveBeenCalledWith(
        mockAnonymousChats[0]
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "anonymous_current_chat",
        "anon1"
      );
    });

    it("should not handle non-existent anonymous chat", () => {
      const { result } = renderHook(() =>
        useChatNavigation({
          user: null,
          chats: undefined,
          anonymousChats: [], // Empty to prevent auto-selection
          setMessages: mockSetMessages,
          setCurrentAnonymousChat: mockSetCurrentAnonymousChat,
        })
      );

      act(() => {
        result.current.handleChatSelect("nonexistent");
      });

      expect(result.current.currentChatId).toBeNull();
      expect(mockSetCurrentAnonymousChat).not.toHaveBeenCalled();
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe("Auto-select First Chat", () => {
    it("should auto-select first chat for authenticated user on home page", () => {
      mockUsePathname.mockReturnValue("/");

      const { result } = renderHook(() =>
        useChatNavigation({
          user: mockUser,
          chats: mockChats,
          anonymousChats: [],
          setMessages: mockSetMessages,
          setCurrentAnonymousChat: mockSetCurrentAnonymousChat,
        })
      );

      // Auto-selection happens in useEffect, so we need to wait for it
      expect(result.current.currentChatId).toBe("chat1");
      expect(mockPush).toHaveBeenCalledWith("/chat/chat1");
    });

    it("should auto-select first anonymous chat on home page", () => {
      mockUsePathname.mockReturnValue("/");

      const { result } = renderHook(() =>
        useChatNavigation({
          user: null,
          chats: undefined,
          anonymousChats: mockAnonymousChats,
          setMessages: mockSetMessages,
          setCurrentAnonymousChat: mockSetCurrentAnonymousChat,
        })
      );

      expect(result.current.currentChatId).toBe("anon1");
      expect(mockSetCurrentAnonymousChat).toHaveBeenCalledWith(
        mockAnonymousChats[0]
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "anonymous_current_chat",
        "anon1"
      );
    });

    it("should sync from URL when on chat page", () => {
      mockUsePathname.mockReturnValue("/chat/existing-chat-id");

      const { result } = renderHook(() =>
        useChatNavigation({
          user: mockUser,
          chats: mockChats,
          anonymousChats: [],
          setMessages: mockSetMessages,
          setCurrentAnonymousChat: mockSetCurrentAnonymousChat,
        })
      );

      // Should sync the chat ID from URL
      expect(result.current.currentChatId).toBe("existing-chat-id");
      expect(mockPush).not.toHaveBeenCalled(); // No navigation needed, already on correct page
    });

    it("should not auto-select when chat is already selected", () => {
      mockUsePathname.mockReturnValue("/");

      const { result, rerender } = renderHook(() =>
        useChatNavigation({
          user: mockUser,
          chats: mockChats,
          anonymousChats: [],
          setMessages: mockSetMessages,
          setCurrentAnonymousChat: mockSetCurrentAnonymousChat,
        })
      );

      // First auto-selection should happen
      expect(result.current.currentChatId).toBe("chat1");
      expect(mockPush).toHaveBeenCalledWith("/chat/chat1");

      // Clear mocks to test that it doesn't auto-select again
      mockPush.mockClear();

      // Re-render shouldn't trigger another auto-selection since chat is already selected
      rerender();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("should not auto-select when no chats available", () => {
      mockUsePathname.mockReturnValue("/");

      const { result } = renderHook(() =>
        useChatNavigation({
          user: mockUser,
          chats: [],
          anonymousChats: [],
          setMessages: mockSetMessages,
          setCurrentAnonymousChat: mockSetCurrentAnonymousChat,
        })
      );

      expect(result.current.currentChatId).toBeNull();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("URL Synchronization", () => {
    it("should sync chat ID from URL for authenticated users", () => {
      mockUsePathname.mockReturnValue("/chat/url-chat-id");

      const { result } = renderHook(() =>
        useChatNavigation({
          user: mockUser,
          chats: mockChats,
          anonymousChats: [],
          setMessages: mockSetMessages,
          setCurrentAnonymousChat: mockSetCurrentAnonymousChat,
        })
      );

      expect(result.current.currentChatId).toBe("url-chat-id");
    });

    it("should auto-select first anonymous chat instead of syncing URL", () => {
      mockUsePathname.mockReturnValue("/"); // Home page for anonymous user

      const { result } = renderHook(() =>
        useChatNavigation({
          user: null,
          chats: undefined,
          anonymousChats: mockAnonymousChats,
          setMessages: mockSetMessages,
          setCurrentAnonymousChat: mockSetCurrentAnonymousChat,
        })
      );

      // Should auto-select first anonymous chat instead of syncing from URL
      expect(result.current.currentChatId).toBe("anon1");
      expect(mockSetCurrentAnonymousChat).toHaveBeenCalledWith(
        mockAnonymousChats[0]
      );
    });

    it("should not sync when not on chat page", () => {
      mockUsePathname.mockReturnValue("/some-other-page");

      const { result } = renderHook(() =>
        useChatNavigation({
          user: mockUser,
          chats: [], // Empty to prevent auto-selection
          anonymousChats: [],
          setMessages: mockSetMessages,
          setCurrentAnonymousChat: mockSetCurrentAnonymousChat,
        })
      );

      expect(result.current.currentChatId).toBeNull();
    });
  });

  describe("Message Management", () => {
    it("should clear messages when no chat is selected", () => {
      const { result } = renderHook(() =>
        useChatNavigation({
          user: mockUser,
          chats: [],
          anonymousChats: [],
          setMessages: mockSetMessages,
          setCurrentAnonymousChat: mockSetCurrentAnonymousChat,
        })
      );

      expect(mockSetMessages).toHaveBeenCalledWith([]);
    });

    it("should not clear messages when chat is selected", () => {
      mockUsePathname.mockReturnValue("/chat/test-chat");

      const { result } = renderHook(() =>
        useChatNavigation({
          user: mockUser,
          chats: mockChats,
          anonymousChats: [],
          setMessages: mockSetMessages,
          setCurrentAnonymousChat: mockSetCurrentAnonymousChat,
        })
      );

      // Should have been called once to clear initially, then once to sync from URL
      expect(mockSetMessages).toHaveBeenCalledTimes(1);
      expect(mockSetMessages).toHaveBeenCalledWith([]);
    });
  });

  describe("State Updates", () => {
    it("should update currentChatId when setCurrentChatId is called", () => {
      mockUsePathname.mockReturnValue("/some-other-page");

      const { result } = renderHook(() =>
        useChatNavigation({
          user: mockUser,
          chats: [], // Empty to prevent auto-selection
          anonymousChats: [],
          setMessages: mockSetMessages,
          setCurrentAnonymousChat: mockSetCurrentAnonymousChat,
        })
      );

      act(() => {
        result.current.setCurrentChatId("new-chat-id");
      });

      expect(result.current.currentChatId).toBe("new-chat-id");
    });

    it("should handle null setCurrentChatId", () => {
      mockUsePathname.mockReturnValue("/some-other-page");

      const { result } = renderHook(() =>
        useChatNavigation({
          user: mockUser,
          chats: [], // Empty to prevent auto-selection
          anonymousChats: [],
          setMessages: mockSetMessages,
          setCurrentAnonymousChat: mockSetCurrentAnonymousChat,
        })
      );

      act(() => {
        result.current.setCurrentChatId("test-chat");
      });

      expect(result.current.currentChatId).toBe("test-chat");

      act(() => {
        result.current.setCurrentChatId(null);
      });

      expect(result.current.currentChatId).toBeNull();
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined chats gracefully", () => {
      mockUsePathname.mockReturnValue("/some-other-page");

      const { result } = renderHook(() =>
        useChatNavigation({
          user: mockUser,
          chats: undefined,
          anonymousChats: [],
          setMessages: mockSetMessages,
          setCurrentAnonymousChat: mockSetCurrentAnonymousChat,
        })
      );

      expect(result.current.currentChatId).toBeNull();
      expect(() => result.current.autoSelectFirstChat()).not.toThrow();
    });

    it("should handle empty anonymousChats array", () => {
      const { result } = renderHook(() =>
        useChatNavigation({
          user: null,
          chats: undefined,
          anonymousChats: [],
          setMessages: mockSetMessages,
          setCurrentAnonymousChat: mockSetCurrentAnonymousChat,
        })
      );

      expect(result.current.currentChatId).toBeNull();
      expect(mockSetCurrentAnonymousChat).not.toHaveBeenCalled();
    });

    it("should handle user switching from authenticated to anonymous", () => {
      mockUsePathname.mockReturnValue("/"); // Home page to trigger auto-selection

      // Test authenticated user first
      const { result: authResult } = renderHook(() =>
        useChatNavigation({
          user: mockUser,
          chats: mockChats,
          anonymousChats: [],
          setMessages: mockSetMessages,
          setCurrentAnonymousChat: mockSetCurrentAnonymousChat,
        })
      );

      // Initially authenticated should auto-select first chat
      expect(authResult.current.currentChatId).toBe("chat1");

      // Test anonymous user separately
      const { result: anonResult } = renderHook(() =>
        useChatNavigation({
          user: null,
          chats: undefined,
          anonymousChats: mockAnonymousChats,
          setMessages: mockSetMessages,
          setCurrentAnonymousChat: mockSetCurrentAnonymousChat,
        })
      );

      // Anonymous user should auto-select first anonymous chat
      expect(anonResult.current.currentChatId).toBe("anon1");
    });
  });
});
