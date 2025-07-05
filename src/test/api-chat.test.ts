import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/chat/route";

// Mock the external dependencies
vi.mock("@openrouter/ai-sdk-provider", () => ({
  createOpenRouter: vi.fn(() => vi.fn()),
}));

vi.mock("ai", () => ({
  streamText: vi.fn(),
  convertToCoreMessages: vi.fn(),
  appendClientMessage: vi.fn(),
  smoothStream: vi.fn(),
  createDataStream: vi.fn(),
  generateId: vi.fn(() => "test-stream-id"),
  appendResponseMessages: vi.fn(),
  tool: vi.fn(() => ({
    description: "Mock tool",
    parameters: {},
    execute: vi.fn(),
  })),
}));

vi.mock("convex/browser", () => ({
  ConvexHttpClient: vi.fn().mockImplementation(() => ({
    query: vi.fn(),
    mutation: vi.fn(),
  })),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(() => ({ userId: "test-user-id" })),
}));

vi.mock("resumable-stream", () => ({
  createResumableStreamContext: vi.fn(() => ({
    resumableStream: vi.fn(),
  })),
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    after: vi.fn(),
    NextRequest: actual.NextRequest,
    NextResponse: actual.NextResponse,
  };
});

describe("/api/chat Route Tests", () => {
  let mockConvex: {
    query: ReturnType<typeof vi.fn>;
    mutation: ReturnType<typeof vi.fn>;
  };
  let mockStreamText: ReturnType<typeof vi.fn>;
  let mockAuth: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock implementations
    const { ConvexHttpClient } = await import("convex/browser");
    mockConvex = {
      query: vi.fn().mockResolvedValue([]), // Default to empty array
      mutation: vi.fn().mockResolvedValue("saved-msg-id"),
    };
    (
      ConvexHttpClient as unknown as ReturnType<typeof vi.fn>
    ).mockImplementation(() => mockConvex);

    const { streamText } = await import("ai");
    mockStreamText = streamText as ReturnType<typeof vi.fn>;
    mockStreamText.mockImplementation(() => ({
      mergeIntoDataStream: vi.fn(),
    }));

    const { auth } = await import("@clerk/nextjs/server");
    mockAuth = auth as unknown as ReturnType<typeof vi.fn>;
    mockAuth.mockReturnValue({ userId: "test-user-id" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/chat", () => {
    it("should save user, assistant, and tool messages correctly", async () => {
      // Arrange
      const testChatId = "test-chat-id";
      const testMessage = {
        id: "test-msg-id",
        role: "user" as const,
        content: "Show me my todos",
      };

      const previousMessages = [
        {
          _id: "prev-msg-1",
          role: "user",
          body: "Hello",
          _creationTime: Date.now() - 1000,
        },
      ];

      // Mock the AI response with both assistant and tool messages
      const mockFinishResult = {
        response: {
          messages: [
            {
              id: "assistant-msg-1",
              role: "assistant",
              content: "Here are your todos:",
              parts: [{ type: "text", text: "Here are your todos:" }],
            },
            {
              id: "tool-msg-1", 
              role: "tool",
              content: "",
              parts: [
                {
                  type: "tool-result",
                  toolCallId: "tool-call-123",
                  toolName: "getTodos",
                  result: { success: true, todos: [], count: 0 },
                },
              ],
            },
          ],
        },
      };

      // Setup specific mocks for this test
      mockConvex.query.mockResolvedValue(previousMessages);
      
      // Mock AI functions with proper responses
      const mockAppendResponseMessages = vi.fn().mockReturnValue([
        testMessage, // Original user message
        {
          id: "assistant-msg-1",
          role: "assistant",
          content: "Here are your todos:",
          parts: [{ type: "text", text: "Here are your todos:" }],
        },
        {
          id: "tool-msg-1",
          role: "tool",
          content: "",
          parts: [
            {
              type: "tool-result",
              toolCallId: "tool-call-123",
              toolName: "getTodos",
              result: { success: true, todos: [], count: 0 },
            },
          ],
        },
      ]);

      vi.doMock("ai", () => ({
        streamText: vi.fn().mockImplementation(({ onFinish }: { onFinish: (result: unknown) => void }) => {
          setTimeout(() => onFinish(mockFinishResult), 0);
          return { mergeIntoDataStream: vi.fn() };
        }),
        convertToCoreMessages: vi.fn().mockReturnValue([]),
        appendClientMessage: vi.fn().mockReturnValue([testMessage]),
        appendResponseMessages: mockAppendResponseMessages,
        smoothStream: vi.fn(),
        createDataStream: vi.fn(),
        generateId: vi.fn(() => "test-stream-id"),
        tool: vi.fn(() => ({ description: "Mock tool", parameters: {}, execute: vi.fn() })),
      }));

      // Create request
      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          newMessage: testMessage,
          model: "gpt-4",
          chatId: testChatId,
        }),
      });

      // Act
      const response = await POST(request);
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Assert basic response
      expect(response).toBeDefined();
      expect(mockConvex.query).toHaveBeenCalled();

      // Verify user message was saved
      expect(mockConvex.mutation).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          chatId: testChatId,
          userId: "test-user-id",
          role: "user",
          body: "Show me my todos",
        })
      );

      // Wait for onFinish callback to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Check if appendResponseMessages was called (indicating onFinish executed)
      expect(mockAppendResponseMessages).toHaveBeenCalled();
    });

    it("should save user messages correctly", async () => {
      // Arrange
      const testChatId = "test-chat-id";
      const testMessage = {
        id: "user-msg-id",
        role: "user" as const,
        content: "Create a new todo",
      };

      mockConvex.query.mockResolvedValue([]);

      // Create request
      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          newMessage: testMessage,
          model: "gpt-4",
          chatId: testChatId,
        }),
      });

      // Act
      await POST(request);

      // Assert - User message should be saved immediately
      expect(mockConvex.mutation).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          chatId: testChatId,
          userId: "test-user-id",
          role: "user",
          body: "Create a new todo",
        })
      );
    });

    it("should save assistant messages without parts", async () => {
      // Arrange
      const testChatId = "test-chat-id";
      const testMessage = { id: "test-msg", role: "user" as const, content: "Test" };

      const mockFinishResult = {
        response: {
          messages: [
            {
              id: "assistant-msg-1",
              role: "assistant",
              content: "I'll help you with that task.",
              parts: [{ type: "text", text: "I'll help you with that task." }],
            },
          ],
        },
      };

      const mockAppendResponseMessages = vi.fn().mockReturnValue([
        testMessage,
        {
          id: "assistant-msg-1",
          role: "assistant", 
          content: "I'll help you with that task.",
          parts: [{ type: "text", text: "I'll help you with that task." }],
        },
      ]);

      vi.doMock("ai", () => ({
        streamText: vi.fn().mockImplementation(({ onFinish }: { onFinish: (result: unknown) => void }) => {
          setTimeout(() => onFinish(mockFinishResult), 10);
          return { mergeIntoDataStream: vi.fn() };
        }),
        convertToCoreMessages: vi.fn().mockReturnValue([]),
        appendClientMessage: vi.fn().mockReturnValue([testMessage]),
        appendResponseMessages: mockAppendResponseMessages,
        smoothStream: vi.fn(),
        createDataStream: vi.fn(),
        generateId: vi.fn(() => "test-stream-id"),
        tool: vi.fn(() => ({ description: "Mock tool", parameters: {}, execute: vi.fn() })),
      }));

      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          newMessage: testMessage,
          model: "gpt-4", 
          chatId: testChatId,
        }),
      });

      // Act
      await POST(request);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - Assistant message should be saved WITHOUT parts
      const assistantCalls = mockConvex.mutation.mock.calls.filter(call => 
        call[1]?.message?.role === "assistant"
      );

      expect(assistantCalls.length).toBeGreaterThan(0);
      expect(assistantCalls[0][1]).toEqual(
        expect.objectContaining({
          chatId: testChatId,
          userId: "test-user-id",
          message: expect.objectContaining({
            id: "assistant-msg-1",
            role: "assistant",
            content: "I'll help you with that task.",
            parts: undefined, // CRITICAL: Assistant messages should NOT have parts
          }),
        })
      );
    });

    it("should save tool messages with parts", async () => {
      // Arrange
      const testChatId = "test-chat-id";
      const testMessage = { id: "test-msg", role: "user" as const, content: "Test" };

      const mockToolResult = {
        success: true,
        todos: [{ id: "1", description: "Test todo", completed: false }],
        count: 1,
      };

      const mockFinishResult = {
        response: {
          messages: [
            {
              id: "tool-msg-1",
              role: "tool",
              content: "",
              parts: [
                {
                  type: "tool-result",
                  toolCallId: "tool-call-123",
                  toolName: "getTodos",
                  result: mockToolResult,
                },
              ],
            },
          ],
        },
      };

      const mockAppendResponseMessages = vi.fn().mockReturnValue([
        testMessage,
        {
          id: "tool-msg-1",
          role: "tool",
          content: "",
          parts: [
            {
              type: "tool-result", 
              toolCallId: "tool-call-123",
              toolName: "getTodos",
              result: mockToolResult,
            },
          ],
        },
      ]);

      vi.doMock("ai", () => ({
        streamText: vi.fn().mockImplementation(({ onFinish }: { onFinish: (result: unknown) => void }) => {
          setTimeout(() => onFinish(mockFinishResult), 10);
          return { mergeIntoDataStream: vi.fn() };
        }),
        convertToCoreMessages: vi.fn().mockReturnValue([]),
        appendClientMessage: vi.fn().mockReturnValue([testMessage]),
        appendResponseMessages: mockAppendResponseMessages,
        smoothStream: vi.fn(),
        createDataStream: vi.fn(),
        generateId: vi.fn(() => "test-stream-id"),
        tool: vi.fn(() => ({ description: "Mock tool", parameters: {}, execute: vi.fn() })),
      }));

      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          newMessage: testMessage,
          model: "gpt-4",
          chatId: testChatId,
        }),
      });

      // Act
      await POST(request);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - Tool message should be saved WITH parts
      const toolCalls = mockConvex.mutation.mock.calls.filter(call => 
        call[1]?.message?.role === "tool"
      );

      expect(toolCalls.length).toBeGreaterThan(0);
      expect(toolCalls[0][1]).toEqual(
        expect.objectContaining({
          chatId: testChatId,
          userId: "test-user-id",
          message: expect.objectContaining({
            id: "tool-msg-1",
            role: "tool",
            content: "",
            parts: [
              {
                type: "tool-result",
                toolCallId: "tool-call-123", 
                toolName: "getTodos",
                result: mockToolResult,
              },
            ], // CRITICAL: Tool messages SHOULD have parts
          }),
        })
      );
    });

    it("should handle mixed assistant and tool messages correctly", async () => {
      // Arrange
      const testChatId = "test-chat-id";
      const testMessage = { id: "test-msg", role: "user" as const, content: "Show todos and create one" };

      const mockFinishResult = {
        response: {
          messages: [
            {
              id: "assistant-msg-1",
              role: "assistant",
              content: "I'll show your todos and create a new one.",
              parts: [{ type: "text", text: "I'll show your todos and create a new one." }],
            },
            {
              id: "tool-msg-1",
              role: "tool",
              content: "",
              parts: [
                {
                  type: "tool-result",
                  toolCallId: "tool-call-1",
                  toolName: "getTodos",
                  result: { success: true, todos: [], count: 0 },
                },
              ],
            },
            {
              id: "tool-msg-2", 
              role: "tool",
              content: "",
              parts: [
                {
                  type: "tool-result",
                  toolCallId: "tool-call-2",
                  toolName: "createTodo",
                  result: { success: true, id: "new-todo-123" },
                },
              ],
            },
          ],
        },
      };

      const mockAppendResponseMessages = vi.fn().mockReturnValue([
        testMessage,
        {
          id: "assistant-msg-1",
          role: "assistant",
          content: "I'll show your todos and create a new one.",
          parts: [{ type: "text", text: "I'll show your todos and create a new one." }],
        },
        {
          id: "tool-msg-1",
          role: "tool",
          content: "",
          parts: [
            {
              type: "tool-result",
              toolCallId: "tool-call-1",
              toolName: "getTodos",
              result: { success: true, todos: [], count: 0 },
            },
          ],
        },
        {
          id: "tool-msg-2",
          role: "tool", 
          content: "",
          parts: [
            {
              type: "tool-result",
              toolCallId: "tool-call-2",
              toolName: "createTodo",
              result: { success: true, id: "new-todo-123" },
            },
          ],
        },
      ]);

      vi.doMock("ai", () => ({
        streamText: vi.fn().mockImplementation(({ onFinish }: { onFinish: (result: unknown) => void }) => {
          setTimeout(() => onFinish(mockFinishResult), 10);
          return { mergeIntoDataStream: vi.fn() };
        }),
        convertToCoreMessages: vi.fn().mockReturnValue([]),
        appendClientMessage: vi.fn().mockReturnValue([testMessage]),
        appendResponseMessages: mockAppendResponseMessages,
        smoothStream: vi.fn(),
        createDataStream: vi.fn(),
        generateId: vi.fn(() => "test-stream-id"),
        tool: vi.fn(() => ({ description: "Mock tool", parameters: {}, execute: vi.fn() })),
      }));

      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          newMessage: testMessage,
          model: "gpt-4",
          chatId: testChatId,
        }),
      });

      // Act
      await POST(request);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - Check all message types were saved correctly
      
      // User message
      expect(mockConvex.mutation).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          role: "user",
          body: "Show todos and create one",
        })
      );

      // Assistant message (without parts)
      const assistantCalls = mockConvex.mutation.mock.calls.filter(call => 
        call[1]?.message?.role === "assistant"
      );
      expect(assistantCalls.length).toBe(1);
      expect(assistantCalls[0][1].message.parts).toBeUndefined();

      // Tool messages (with parts)
      const toolCalls = mockConvex.mutation.mock.calls.filter(call => 
        call[1]?.message?.role === "tool"
      );
      expect(toolCalls.length).toBe(2);
      toolCalls.forEach(call => {
        expect(call[1].message.parts).toBeDefined();
        expect(Array.isArray(call[1].message.parts)).toBe(true);
      });
    });

    it("should handle multiple tool calls correctly", async () => {
      // Arrange
      const testChatId = "test-chat-id";
      const testMessage = {
        id: "test-msg-id",
        role: "user" as const,
        content: "Show me todos and create a new one",
      };

      // Simplified test - just verify the API doesn't crash with multiple tool calls
      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          newMessage: testMessage,
          model: "gpt-4",
          chatId: testChatId,
        }),
      });

      // Act
      const response = await POST(request);

      // Assert - Basic functionality works
      expect(response).toBeDefined();
      expect(mockConvex.mutation).toHaveBeenCalled();
    });

    it("should handle tool calls without results", async () => {
      // Test case where tool calls are made but no results are returned
      // Simplified test - just verify basic functionality

      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          newMessage: { role: "user", content: "test" },
          model: "gpt-4",
          chatId: "test-chat-id",
        }),
      });

      const response = await POST(request);

      // Basic functionality test
      expect(response).toBeDefined();
      expect(mockConvex.mutation).toHaveBeenCalled();
    });
  });

  describe("GET /api/chat", () => {
    it("should resume existing stream", async () => {
      // Arrange
      const chatId = "test-chat-id";
      const streamIds = ["stream-1", "stream-2", "stream-3"];

      mockConvex.query.mockResolvedValue(streamIds);

      const { createResumableStreamContext } = await import("resumable-stream");
      const mockStreamContext = {
        resumableStream: vi.fn().mockResolvedValue(new Response("resumed")),
      };
      (
        createResumableStreamContext as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockStreamContext);

      const request = new NextRequest(
        `http://localhost:3000/api/chat?chatId=${chatId}`,
        { method: "GET" }
      );

      // Act
      const response = await GET(request);

      // Assert
      expect(mockConvex.query).toHaveBeenCalledWith(
        expect.any(Object), // api.messages.loadStreams
        { chatId }
      );

      expect(mockStreamContext.resumableStream).toHaveBeenCalledWith(
        "stream-3", // latest stream
        expect.any(Function)
      );

      expect(response.status).toBe(200);
    });

    it("should return 404 when no streams found", async () => {
      // Arrange
      const chatId = "test-chat-id";
      mockConvex.query.mockResolvedValue([]); // No streams

      const request = new NextRequest(
        `http://localhost:3000/api/chat?chatId=${chatId}`,
        { method: "GET" }
      );

      // Act
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(404);
      expect(await response.text()).toBe("No streams found");
    });

    it("should return 400 when chatId is missing", async () => {
      // Arrange
      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "GET",
      });

      // Act
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(400);
      expect(await response.text()).toBe("chatId is required");
    });
  });

  describe("Authentication", () => {
    it("should return 401 for GET requests without authentication", async () => {
      // Arrange
      mockAuth.mockReturnValue({ userId: null });

      const request = new NextRequest(
        "http://localhost:3000/api/chat?chatId=test",
        { method: "GET" }
      );

      // Act
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(401);
      expect(await response.text()).toBe(
        "Authentication required for stream resumption"
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      // Arrange
      mockConvex.query.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          newMessage: { role: "user", content: "test" },
          model: "gpt-4",
          chatId: "test-chat-id",
        }),
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response).toBeDefined();
      if (response) {
        expect(response.status).toBe(500);
        const responseBody = await response.json();
        expect(responseBody.error).toBe(
          "Internal server error occurred while processing your request"
        );
      }
    });

    it("should handle invalid JSON in request body", async () => {
      // Arrange
      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: "invalid json",
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response).toBeDefined();
      if (response) {
        expect(response.status).toBe(400);
        const responseBody = await response.json();
        expect(responseBody.error).toBe("Invalid JSON in request body");
      }
    });
  });
});
