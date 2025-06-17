import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateChatTitle,
  createUserMessage,
  createAssistantMessage,
  isAnonymousChatId,
  generateAnonymousChatId,
  isConvexChatId,
  ANONYMOUS_STORAGE_KEYS,
  calculateRemainingMessages,
  isAnonymousLimitReached,
  getNumberFromStorage,
  setNumberInStorage,
  getObjectFromStorage,
  setObjectInStorage,
  clearAnonymousData,
} from "../chatHelpers";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("chatHelpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("generateChatTitle", () => {
    it("should generate title from short content", () => {
      const title = generateChatTitle("Hello world");
      expect(title).toBe("Hello world");
    });

    it("should truncate long content with ellipsis", () => {
      const longContent =
        "This is a very long message that exceeds the default length limit";
      const title = generateChatTitle(longContent);
      expect(title).toBe("This is a very long message th...");
    });

    it("should handle empty content", () => {
      const title = generateChatTitle("");
      expect(title).toBe("New Chat");
    });

    it("should handle whitespace-only content", () => {
      const title = generateChatTitle("   ");
      expect(title).toBe("New Chat");
    });

    it("should respect custom max length", () => {
      const title = generateChatTitle("Hello world", 5);
      expect(title).toBe("Hello...");
    });

    it("should trim whitespace from content", () => {
      const title = generateChatTitle("  Hello world  ");
      expect(title).toBe("Hello world");
    });
  });

  describe("createUserMessage", () => {
    it("should create user message with default ID", () => {
      const message = createUserMessage("Hello world");

      expect(message.role).toBe("user");
      expect(message.content).toBe("Hello world");
      expect(message.id).toMatch(/^\d+_user$/);
      expect(message.createdAt).toBeInstanceOf(Date);
    });

    it("should create user message with custom ID", () => {
      const message = createUserMessage("Hello world", "custom-123");

      expect(message.id).toBe("custom-123");
      expect(message.role).toBe("user");
      expect(message.content).toBe("Hello world");
    });

    it("should trim content", () => {
      const message = createUserMessage("  Hello world  ");
      expect(message.content).toBe("Hello world");
    });
  });

  describe("createAssistantMessage", () => {
    it("should create assistant message with default ID", () => {
      const message = createAssistantMessage("AI response");

      expect(message.role).toBe("assistant");
      expect(message.content).toBe("AI response");
      expect(message.id).toMatch(/^\d+_assistant$/);
      expect(message.createdAt).toBeInstanceOf(Date);
    });

    it("should create assistant message with custom ID", () => {
      const message = createAssistantMessage("AI response", "ai-456");

      expect(message.id).toBe("ai-456");
      expect(message.role).toBe("assistant");
      expect(message.content).toBe("AI response");
    });
  });

  describe("isAnonymousChatId", () => {
    it("should return true for anonymous chat IDs", () => {
      expect(isAnonymousChatId("anon_123_abc")).toBe(true);
      expect(isAnonymousChatId("anon_1234567890_xyz123")).toBe(true);
    });

    it("should return false for non-anonymous chat IDs", () => {
      expect(isAnonymousChatId("jd2k3jd2k3jd2k3jd2")).toBe(false);
      expect(isAnonymousChatId("regular-chat-id")).toBe(false);
    });

    it("should return false for null/undefined", () => {
      expect(isAnonymousChatId(null)).toBe(false);
      expect(isAnonymousChatId(undefined)).toBe(false);
    });

    it("should return false for non-string values", () => {
      expect(isAnonymousChatId(123 as never)).toBe(false);
      expect(isAnonymousChatId({} as never)).toBe(false);
    });
  });

  describe("generateAnonymousChatId", () => {
    it("should generate unique anonymous chat IDs", () => {
      const id1 = generateAnonymousChatId();
      const id2 = generateAnonymousChatId();

      expect(id1).toMatch(/^anon_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^anon_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it("should generate IDs that pass isAnonymousChatId check", () => {
      const id = generateAnonymousChatId();
      expect(isAnonymousChatId(id)).toBe(true);
    });
  });

  describe("isConvexChatId", () => {
    it("should return true for valid Convex IDs", () => {
      expect(isConvexChatId("jd2k3jd2k3jd2k3jd2k3jd2")).toBe(true);
      expect(isConvexChatId("veryLongConvexId123")).toBe(true);
    });

    it("should return false for anonymous IDs", () => {
      expect(isConvexChatId("anon_123_abc")).toBe(false);
    });

    it("should return false for short IDs", () => {
      expect(isConvexChatId("short")).toBe(false);
    });

    it("should return false for null/undefined", () => {
      expect(isConvexChatId(null)).toBe(false);
      expect(isConvexChatId(undefined)).toBe(false);
    });
  });

  describe("ANONYMOUS_STORAGE_KEYS", () => {
    it("should have all required keys", () => {
      expect(ANONYMOUS_STORAGE_KEYS.MESSAGE_COUNT).toBe(
        "anonymous_message_count"
      );
      expect(ANONYMOUS_STORAGE_KEYS.AI_COUNT).toBe(
        "anonymous_ai_message_count"
      );
      expect(ANONYMOUS_STORAGE_KEYS.CHATS).toBe("anonymous_chats");
      expect(ANONYMOUS_STORAGE_KEYS.CURRENT_CHAT).toBe(
        "anonymous_current_chat"
      );
    });
  });

  describe("calculateRemainingMessages", () => {
    it("should calculate remaining messages correctly", () => {
      expect(calculateRemainingMessages(3, 10)).toBe(7);
      expect(calculateRemainingMessages(0, 5)).toBe(5);
      expect(calculateRemainingMessages(5, 5)).toBe(0);
    });

    it("should return 0 when limit is exceeded", () => {
      expect(calculateRemainingMessages(12, 10)).toBe(0);
      expect(calculateRemainingMessages(15, 10)).toBe(0);
    });
  });

  describe("isAnonymousLimitReached", () => {
    it("should return false when under limit", () => {
      expect(isAnonymousLimitReached(3, 10)).toBe(false);
      expect(isAnonymousLimitReached(0, 5)).toBe(false);
    });

    it("should return true when at or over limit", () => {
      expect(isAnonymousLimitReached(10, 10)).toBe(true);
      expect(isAnonymousLimitReached(12, 10)).toBe(true);
    });
  });

  describe("localStorage helpers", () => {
    describe("getNumberFromStorage", () => {
      it("should return parsed number from localStorage", () => {
        localStorageMock.getItem.mockReturnValue("42");
        const result = getNumberFromStorage("test-key");
        expect(result).toBe(42);
        expect(localStorageMock.getItem).toHaveBeenCalledWith("test-key");
      });

      it("should return default value when key doesn't exist", () => {
        localStorageMock.getItem.mockReturnValue(null);
        const result = getNumberFromStorage("test-key", 0);
        expect(result).toBe(0);
      });

      it("should return default value for invalid number", () => {
        localStorageMock.getItem.mockReturnValue("invalid");
        const result = getNumberFromStorage("test-key", 5);
        expect(result).toBe(5);
      });

      it("should handle localStorage errors", () => {
        localStorageMock.getItem.mockImplementation(() => {
          throw new Error("Storage error");
        });
        const result = getNumberFromStorage("test-key", 10);
        expect(result).toBe(10);
      });
    });

    describe("setNumberInStorage", () => {
      it("should save number to localStorage", () => {
        setNumberInStorage("test-key", 42);
        expect(localStorageMock.setItem).toHaveBeenCalledWith("test-key", "42");
      });

      it("should handle localStorage errors gracefully", () => {
        const consoleSpy = vi
          .spyOn(console, "warn")
          .mockImplementation(() => {});
        localStorageMock.setItem.mockImplementation(() => {
          throw new Error("Storage error");
        });

        expect(() => setNumberInStorage("test-key", 42)).not.toThrow();
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });
    });

    describe("getObjectFromStorage", () => {
      it("should return parsed object from localStorage", () => {
        const testObject = { name: "test", count: 5 };
        localStorageMock.getItem.mockReturnValue(JSON.stringify(testObject));

        const result = getObjectFromStorage("test-key", {});
        expect(result).toEqual(testObject);
      });

      it("should return default value when key doesn't exist", () => {
        localStorageMock.getItem.mockReturnValue(null);
        const defaultValue = { default: true };

        const result = getObjectFromStorage("test-key", defaultValue);
        expect(result).toBe(defaultValue);
      });

      it("should return default value for invalid JSON", () => {
        localStorageMock.getItem.mockReturnValue("invalid json");
        const defaultValue = { default: true };

        const result = getObjectFromStorage("test-key", defaultValue);
        expect(result).toBe(defaultValue);
      });
    });

    describe("setObjectInStorage", () => {
      it("should save object to localStorage", () => {
        const testObject = { name: "test", count: 5 };
        setObjectInStorage("test-key", testObject);

        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          "test-key",
          JSON.stringify(testObject)
        );
      });
    });

    describe("clearAnonymousData", () => {
      it("should remove all anonymous storage keys", () => {
        clearAnonymousData();

        expect(localStorageMock.removeItem).toHaveBeenCalledWith(
          "anonymous_message_count"
        );
        expect(localStorageMock.removeItem).toHaveBeenCalledWith(
          "anonymous_ai_message_count"
        );
        expect(localStorageMock.removeItem).toHaveBeenCalledWith(
          "anonymous_chats"
        );
        expect(localStorageMock.removeItem).toHaveBeenCalledWith(
          "anonymous_current_chat"
        );
        expect(localStorageMock.removeItem).toHaveBeenCalledTimes(4);
      });

      it("should handle localStorage errors gracefully", () => {
        const consoleSpy = vi
          .spyOn(console, "warn")
          .mockImplementation(() => {});
        localStorageMock.removeItem.mockImplementation(() => {
          throw new Error("Storage error");
        });

        expect(() => clearAnonymousData()).not.toThrow();
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });
    });
  });
});
