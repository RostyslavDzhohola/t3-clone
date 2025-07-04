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
      query: vi.fn(),
      mutation: vi.fn(),
    };
    (
      ConvexHttpClient as unknown as ReturnType<typeof vi.fn>
    ).mockImplementation(() => mockConvex);

    const { streamText } = await import("ai");
    mockStreamText = streamText as ReturnType<typeof vi.fn>;

    const { auth } = await import("@clerk/nextjs/server");
    mockAuth = auth as unknown as ReturnType<typeof vi.fn>;
    mockAuth.mockReturnValue({ userId: "test-user-id" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/chat", () => {
    it("should save tool calls, tool results, and final response in correct order", async () => {
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

      const mockToolCall = {
        toolCallId: "tool-call-123",
        toolName: "getTodos",
        args: { completed: false },
      };

      const mockToolResult = {
        toolCallId: "tool-call-123",
        toolName: "getTodos",
        result: {
          success: true,
          todos: [{ id: "1", description: "Test todo", completed: false }],
          count: 1,
        },
      };

      const mockFinishResult = {
        response: {
          messages: [
            {
              id: "assistant-msg-1",
              role: "assistant",
              content: "Here are your todos:",
              parts: [
                { type: "text", text: "Here are your todos:" },
              ],
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
                  result: mockToolResult.result,
                },
              ],
            },
          ],
        },
        toolCalls: [mockToolCall],
        toolResults: [mockToolResult],
        text: "Here are your todos:",
      };

      // Mock Convex responses
      mockConvex.query.mockResolvedValue(previousMessages);
      mockConvex.mutation.mockResolvedValue("saved-msg-id");

      // Mock streamText
      const mockResult = {
        mergeIntoDataStream: vi.fn(),
      };

      mockStreamText.mockImplementation(
        ({ onFinish }: { onFinish: (result: unknown) => void }) => {
          // Simulate the onFinish callback being called
          setTimeout(() => onFinish(mockFinishResult), 0);
          return mockResult;
        }
      );

      // Mock other AI functions using the existing mocks
      vi.doMock("ai", () => ({
        streamText: mockStreamText,
        convertToCoreMessages: vi.fn().mockReturnValue([]),
        appendClientMessage: vi.fn().mockReturnValue([testMessage]),
        appendResponseMessages: vi.fn().mockReturnValue([
          // Original user message
          testMessage,
          // AI response messages
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
                result: mockToolResult.result,
              },
            ],
          },
        ]),
        smoothStream: vi.fn(),
        createDataStream: vi.fn(),
        generateId: vi.fn(() => "test-stream-id"),
        tool: vi.fn(() => ({
          description: "Mock tool",
          parameters: {},
          execute: vi.fn(),
        })),
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

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(response).toBeDefined();
      expect(mockConvex.query).toHaveBeenCalledWith(
        expect.any(Object), // api.messages.getMessages
        { chatId: testChatId }
      );

      // Verify user message was saved
      expect(mockConvex.mutation).toHaveBeenCalledWith(
        expect.any(Object), // api.messages.saveMessage
        {
          chatId: testChatId,
          userId: "test-user-id",
          role: "user",
          body: "Show me my todos",
        }
      );

      // Verify assistant message was saved (without parts)
      expect(mockConvex.mutation).toHaveBeenCalledWith(
        expect.any(Object), // api.messages.saveRichMessage
        {
          chatId: testChatId,
          userId: "test-user-id",
          message: {
            id: "assistant-msg-1",
            role: "assistant",
            content: "Here are your todos:",
            parts: undefined, // Assistant messages should not have parts
          },
        }
      );

      // Verify tool message was saved (with parts)
      expect(mockConvex.mutation).toHaveBeenCalledWith(
        expect.any(Object), // api.messages.saveRichMessage
        {
          chatId: testChatId,
          userId: "test-user-id",
          message: {
            id: "tool-msg-1",
            role: "tool",
            content: "",
            parts: [
              {
                type: "tool-result",
                toolCallId: "tool-call-123",
                toolName: "getTodos",
                result: mockToolResult.result,
              },
            ], // Tool messages should have parts
          },
        }
      );

      // Verify stream was registered
      expect(mockConvex.mutation).toHaveBeenCalledWith(
        expect.any(Object), // api.messages.appendStreamId
        {
          chatId: testChatId,
          streamId: "test-stream-id",
          userId: "test-user-id",
        }
      );
    });

    it("should handle multiple tool calls correctly", async () => {
      // Arrange
      const testChatId = "test-chat-id";
      const testMessage = {
        id: "test-msg-id",
        role: "user" as const,
        content: "Show me todos and create a new one",
      };

      const mockFinishResult = {
        toolCalls: [
          {
            toolCallId: "tool-call-1",
            toolName: "getTodos",
            args: {},
          },
          {
            toolCallId: "tool-call-2",
            toolName: "createTodo",
            args: { description: "New task" },
          },
        ],
        toolResults: [
          {
            toolCallId: "tool-call-1",
            toolName: "getTodos",
            result: { success: true, todos: [], count: 0 },
          },
          {
            toolCallId: "tool-call-2",
            toolName: "createTodo",
            result: { success: true, id: "new-todo-id" },
          },
        ],
        text: "I've shown your todos and created a new one.",
      };

      // Mock setup (similar to previous test)
      mockConvex.query.mockResolvedValue([]);
      const saveMessageMock = vi.fn().mockResolvedValue("saved-msg-id");
      mockConvex.mutation.mockImplementation(saveMessageMock);

      mockStreamText.mockImplementation(
        ({ onFinish }: { onFinish: (result: unknown) => void }) => {
          setTimeout(() => onFinish(mockFinishResult), 0);
          return { mergeIntoDataStream: vi.fn() };
        }
      );

      const { convertToCoreMessages, appendClientMessage } = await import("ai");
      (convertToCoreMessages as ReturnType<typeof vi.fn>).mockReturnValue([]);
      (appendClientMessage as ReturnType<typeof vi.fn>).mockReturnValue([
        testMessage,
      ]);

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

      // Assert
      // Should save 2 tool calls, 2 tool results, and 1 final response (plus 1 user message)
      expect(saveMessageMock).toHaveBeenCalledTimes(6);

      // Verify both tool calls were saved
      expect(saveMessageMock).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          role: "assistant",
          toolCallId: "tool-call-1",
          toolName: "getTodos",
        })
      );

      expect(saveMessageMock).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          role: "assistant",
          toolCallId: "tool-call-2",
          toolName: "createTodo",
        })
      );

      // Verify both tool results were saved
      expect(saveMessageMock).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          role: "tool",
          toolCallId: "tool-call-1",
          toolName: "getTodos",
        })
      );

      expect(saveMessageMock).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          role: "tool",
          toolCallId: "tool-call-2",
          toolName: "createTodo",
        })
      );
    });

    it("should handle tool calls without results", async () => {
      // Test case where tool calls are made but no results are returned
      const mockFinishResult = {
        toolCalls: [
          {
            toolCallId: "tool-call-1",
            toolName: "getTodos",
            args: {},
          },
        ],
        toolResults: [], // No results
        text: "I'll get your todos.",
      };

      mockConvex.query.mockResolvedValue([]);
      const saveMessageMock = vi.fn().mockResolvedValue("saved-msg-id");
      mockConvex.mutation.mockImplementation(saveMessageMock);

      mockStreamText.mockImplementation(
        ({ onFinish }: { onFinish: (result: unknown) => void }) => {
          setTimeout(() => onFinish(mockFinishResult), 0);
          return { mergeIntoDataStream: vi.fn() };
        }
      );

      const { convertToCoreMessages, appendClientMessage } = await import("ai");
      (convertToCoreMessages as ReturnType<typeof vi.fn>).mockReturnValue([]);
      (appendClientMessage as ReturnType<typeof vi.fn>).mockReturnValue([
        { role: "user", content: "test" },
      ]);

      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          newMessage: { role: "user", content: "test" },
          model: "gpt-4",
          chatId: "test-chat-id",
        }),
      });

      await POST(request);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should save 1 tool call and 1 final response (plus 1 user message)
      expect(saveMessageMock).toHaveBeenCalledTimes(3);

      // Verify tool call was saved
      expect(saveMessageMock).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          role: "assistant",
          toolCallId: "tool-call-1",
          toolName: "getTodos",
        })
      );

      // Verify final response was saved
      expect(saveMessageMock).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          role: "assistant",
          body: "I'll get your todos.",
        })
      );
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
