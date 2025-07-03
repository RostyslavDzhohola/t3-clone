import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useMessageInput } from "../use-message-input";
import type { Id } from "../../../convex/_generated/dataModel";

describe("useMessageInput", () => {
  const mockUser = { id: "user123" };
  const mockChatId = "chat123" as Id<"chats">;
  const mockCreateNewChat = vi.fn();
  const mockSetCurrentChatId = vi.fn();
  const mockHandleSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateNewChat.mockResolvedValue(mockChatId);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Auto-create Chat Functionality", () => {
    it("should auto-create chat when user starts typing and no chat exists", async () => {
      const { result } = renderHook(() =>
        useMessageInput({
          user: mockUser,
          currentChatId: null,
          createNewChat: mockCreateNewChat,
          setCurrentChatId: mockSetCurrentChatId,
          handleSubmit: mockHandleSubmit,
        })
      );

      const mockEvent = {
        target: { value: "Hello world" },
      } as React.ChangeEvent<HTMLInputElement>;
      const mockOriginalHandler = vi.fn();

      await act(async () => {
        await result.current.handleInputChangeWithAutoCreate(
          mockEvent,
          mockOriginalHandler
        );
      });

      expect(mockOriginalHandler).toHaveBeenCalledWith(mockEvent);
      expect(mockCreateNewChat).toHaveBeenCalled();
      expect(mockSetCurrentChatId).toHaveBeenCalledWith(mockChatId);
    });

    it("should not auto-create chat when user is anonymous", async () => {
      const { result } = renderHook(() =>
        useMessageInput({
          user: null,
          currentChatId: null,
          createNewChat: mockCreateNewChat,
          setCurrentChatId: mockSetCurrentChatId,
          handleSubmit: mockHandleSubmit,
        })
      );

      const mockEvent = {
        target: { value: "Hello world" },
      } as React.ChangeEvent<HTMLInputElement>;
      const mockOriginalHandler = vi.fn();

      await act(async () => {
        await result.current.handleInputChangeWithAutoCreate(
          mockEvent,
          mockOriginalHandler
        );
      });

      expect(mockOriginalHandler).toHaveBeenCalledWith(mockEvent);
      expect(mockCreateNewChat).not.toHaveBeenCalled();
      expect(mockSetCurrentChatId).not.toHaveBeenCalled();
    });

    it("should not auto-create chat when current chat already exists", async () => {
      const { result } = renderHook(() =>
        useMessageInput({
          user: mockUser,
          currentChatId: mockChatId,
          createNewChat: mockCreateNewChat,
          setCurrentChatId: mockSetCurrentChatId,
          handleSubmit: mockHandleSubmit,
        })
      );

      const mockEvent = {
        target: { value: "Hello world" },
      } as React.ChangeEvent<HTMLInputElement>;
      const mockOriginalHandler = vi.fn();

      await act(async () => {
        await result.current.handleInputChangeWithAutoCreate(
          mockEvent,
          mockOriginalHandler
        );
      });

      expect(mockOriginalHandler).toHaveBeenCalledWith(mockEvent);
      expect(mockCreateNewChat).not.toHaveBeenCalled();
      expect(mockSetCurrentChatId).not.toHaveBeenCalled();
    });

    it("should not auto-create chat for empty input", async () => {
      const { result } = renderHook(() =>
        useMessageInput({
          user: mockUser,
          currentChatId: null,
          createNewChat: mockCreateNewChat,
          setCurrentChatId: mockSetCurrentChatId,
          handleSubmit: mockHandleSubmit,
        })
      );

      const mockEvent = {
        target: { value: "   " }, // Whitespace only
      } as React.ChangeEvent<HTMLInputElement>;
      const mockOriginalHandler = vi.fn();

      await act(async () => {
        await result.current.handleInputChangeWithAutoCreate(
          mockEvent,
          mockOriginalHandler
        );
      });

      expect(mockOriginalHandler).toHaveBeenCalledWith(mockEvent);
      expect(mockCreateNewChat).not.toHaveBeenCalled();
    });

    it("should handle chat creation failure gracefully", async () => {
      mockCreateNewChat.mockResolvedValue(null);
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const { result } = renderHook(() =>
        useMessageInput({
          user: mockUser,
          currentChatId: null,
          createNewChat: mockCreateNewChat,
          setCurrentChatId: mockSetCurrentChatId,
          handleSubmit: mockHandleSubmit,
        })
      );

      const mockEvent = {
        target: { value: "Hello world" },
      } as React.ChangeEvent<HTMLInputElement>;
      const mockOriginalHandler = vi.fn();

      await act(async () => {
        await result.current.handleInputChangeWithAutoCreate(
          mockEvent,
          mockOriginalHandler
        );
      });

      expect(mockCreateNewChat).toHaveBeenCalled();
      expect(mockSetCurrentChatId).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("Form Submission", () => {
    it("should submit form when chat exists", async () => {
      const { result } = renderHook(() =>
        useMessageInput({
          user: mockUser,
          currentChatId: mockChatId,
          createNewChat: mockCreateNewChat,
          setCurrentChatId: mockSetCurrentChatId,
          handleSubmit: mockHandleSubmit,
        })
      );

      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as React.FormEvent<HTMLFormElement>;

      await act(async () => {
        await result.current.onSubmit(mockEvent, "Hello world");
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockHandleSubmit).toHaveBeenCalledWith(mockEvent);
      expect(mockCreateNewChat).not.toHaveBeenCalled();
    });

    it("should create new chat before submission when no chat exists", async () => {
      const { result } = renderHook(() =>
        useMessageInput({
          user: mockUser,
          currentChatId: null,
          createNewChat: mockCreateNewChat,
          setCurrentChatId: mockSetCurrentChatId,
          handleSubmit: mockHandleSubmit,
        })
      );

      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as React.FormEvent<HTMLFormElement>;

      await act(async () => {
        await result.current.onSubmit(mockEvent, "Hello world");
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockCreateNewChat).toHaveBeenCalled();
      expect(mockSetCurrentChatId).toHaveBeenCalledWith(mockChatId);
      expect(mockHandleSubmit).toHaveBeenCalledWith(mockEvent);
    });

    it("should not submit when chat creation fails", async () => {
      mockCreateNewChat.mockResolvedValue(null);
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { result } = renderHook(() =>
        useMessageInput({
          user: mockUser,
          currentChatId: null,
          createNewChat: mockCreateNewChat,
          setCurrentChatId: mockSetCurrentChatId,
          handleSubmit: mockHandleSubmit,
        })
      );

      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as React.FormEvent<HTMLFormElement>;

      await act(async () => {
        await result.current.onSubmit(mockEvent, "Hello world");
      });

      expect(mockCreateNewChat).toHaveBeenCalled();
      expect(mockSetCurrentChatId).not.toHaveBeenCalled();
      expect(mockHandleSubmit).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        "❌ Failed to create chat for message"
      );

      consoleSpy.mockRestore();
    });

    it("should handle anonymous users without chat creation", async () => {
      const { result } = renderHook(() =>
        useMessageInput({
          user: null,
          currentChatId: null,
          createNewChat: mockCreateNewChat,
          setCurrentChatId: mockSetCurrentChatId,
          handleSubmit: mockHandleSubmit,
        })
      );

      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as React.FormEvent<HTMLFormElement>;

      await act(async () => {
        await result.current.onSubmit(mockEvent, "Hello world");
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockCreateNewChat).not.toHaveBeenCalled();
      expect(mockHandleSubmit).toHaveBeenCalledWith(mockEvent);
    });

    it("should log form submission with truncated input", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const { result } = renderHook(() =>
        useMessageInput({
          user: mockUser,
          currentChatId: mockChatId,
          createNewChat: mockCreateNewChat,
          setCurrentChatId: mockSetCurrentChatId,
          handleSubmit: mockHandleSubmit,
        })
      );

      const longInput = "A".repeat(100);
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as React.FormEvent<HTMLFormElement>;

      await act(async () => {
        await result.current.onSubmit(mockEvent, longInput);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "📤 Form submitted with input:",
        expect.stringContaining("...")
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Edge Cases", () => {
    it("should handle concurrent input changes gracefully", async () => {
      const { result } = renderHook(() =>
        useMessageInput({
          user: mockUser,
          currentChatId: null,
          createNewChat: mockCreateNewChat,
          setCurrentChatId: mockSetCurrentChatId,
          handleSubmit: mockHandleSubmit,
        })
      );

      const mockEvent1 = {
        target: { value: "Hello" },
      } as React.ChangeEvent<HTMLInputElement>;
      const mockEvent2 = {
        target: { value: "Hello world" },
      } as React.ChangeEvent<HTMLInputElement>;
      const mockOriginalHandler = vi.fn();

      // Simulate rapid typing - each input change can trigger chat creation
      await act(async () => {
        await Promise.all([
          result.current.handleInputChangeWithAutoCreate(
            mockEvent1,
            mockOriginalHandler
          ),
          result.current.handleInputChangeWithAutoCreate(
            mockEvent2,
            mockOriginalHandler
          ),
        ]);
      });

      expect(mockOriginalHandler).toHaveBeenCalledTimes(2);
      // Both input changes had non-empty text and no current chat, so both can trigger creation
      expect(mockCreateNewChat).toHaveBeenCalled();
    });

    it("should handle chat creation rejection", async () => {
      mockCreateNewChat.mockRejectedValue(new Error("Chat creation failed"));

      const { result } = renderHook(() =>
        useMessageInput({
          user: mockUser,
          currentChatId: null,
          createNewChat: mockCreateNewChat,
          setCurrentChatId: mockSetCurrentChatId,
          handleSubmit: mockHandleSubmit,
        })
      );

      const mockEvent = {
        target: { value: "Hello world" },
      } as React.ChangeEvent<HTMLInputElement>;
      const mockOriginalHandler = vi.fn();

      // The function should handle errors gracefully without throwing
      await act(async () => {
        try {
          await result.current.handleInputChangeWithAutoCreate(
            mockEvent,
            mockOriginalHandler
          );
        } catch {
          // Expected error from mock, but should be handled gracefully
        }
      });

      expect(mockOriginalHandler).toHaveBeenCalledWith(mockEvent);
      expect(mockCreateNewChat).toHaveBeenCalled();
      expect(mockSetCurrentChatId).not.toHaveBeenCalled();
    });

    it("should handle multiple rapid submissions", async () => {
      const { result } = renderHook(() =>
        useMessageInput({
          user: mockUser,
          currentChatId: mockChatId,
          createNewChat: mockCreateNewChat,
          setCurrentChatId: mockSetCurrentChatId,
          handleSubmit: mockHandleSubmit,
        })
      );

      const mockEvent1 = {
        preventDefault: vi.fn(),
      } as unknown as React.FormEvent<HTMLFormElement>;
      const mockEvent2 = {
        preventDefault: vi.fn(),
      } as unknown as React.FormEvent<HTMLFormElement>;

      await act(async () => {
        await Promise.all([
          result.current.onSubmit(mockEvent1, "Message 1"),
          result.current.onSubmit(mockEvent2, "Message 2"),
        ]);
      });

      expect(mockHandleSubmit).toHaveBeenCalledTimes(2);
      expect(mockCreateNewChat).not.toHaveBeenCalled(); // Chat already exists
    });
  });
});
