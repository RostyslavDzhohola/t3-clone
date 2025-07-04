import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  streamText,
  convertToCoreMessages,
  appendClientMessage,
  appendResponseMessages,
  smoothStream,
  createDataStream,
  generateId,
  tool,
  type CoreMessage,
} from "ai";
import { type Message } from "@ai-sdk/react";
import { getModelById, getDefaultModel } from "@/lib/models";
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { auth } from "@clerk/nextjs/server";
import type { Id } from "../../../../convex/_generated/dataModel";
import { createResumableStreamContext } from "resumable-stream";
import { after } from "next/server";
import { z } from "zod";
import { tools as aiTools } from "@/ai/tools";

// Initialize Convex client for server-side usage
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

// Create resumable stream context
const streamContext = createResumableStreamContext({
  waitUntil: after,
});

// 🛠️ Define To-Do Management Tools
const todoTools = {
  createTodo: tool({
    description:
      "Create a new to-do item for the user. Extract the task description directly from what the user wants to add to their todo list. After successfully creating, consider calling getTodos to show the user their updated list including the new item.",
    parameters: z.object({
      description: z
        .string()
        .describe(
          "The task description - what the user wants to do or be reminded of"
        ),
      project: z
        .string()
        .optional()
        .describe("Optional project name to categorize the to-do"),
      tags: z
        .array(z.string())
        .optional()
        .describe("Optional tags for categorization"),
      priority: z
        .enum(["low", "medium", "high"])
        .optional()
        .describe("Priority level of the to-do"),
      dueDate: z
        .string()
        .optional()
        .describe("Optional due date in ISO format (e.g., '2024-01-15')"),
    }),
    execute: async ({ description, project, tags, priority, dueDate }) => {
      try {
        // Extract user ID from the most recent user message context
        // This is a simplified approach - in production, you'd want more robust user identification
        // TODO: Add more robust user identification
        console.log("🛠️ [TOOL] createTodo called:", {
          description,
          project,
          tags,
          priority,
          dueDate,
        });

        // Since we're in a server action context, we need to get the authenticated user
        const { userId } = await auth();
        if (!userId) {
          throw new Error("User not authenticated");
        }

        // Parse due date if provided
        let dueDateTimestamp: number | undefined;
        if (dueDate) {
          const parsedDate = new Date(dueDate);
          if (isNaN(parsedDate.getTime())) {
            throw new Error("Invalid date format provided");
          }
          dueDateTimestamp = parsedDate.getTime();
        }

        const todoId = await convex.mutation(api.todos.createTodo, {
          userId,
          description,
          project,
          tags,
          priority,
          dueDate: dueDateTimestamp,
        });

        console.log("✅ [TOOL] Todo created successfully:", todoId);
        return {
          success: true,
          todoId,
          message: `Successfully created to-do: "${description}"${
            project ? ` in project "${project}"` : ""
          }${priority ? ` with ${priority} priority` : ""}`,
        };
      } catch (error) {
        console.error("❌ [TOOL] Failed to create todo:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to create to-do",
        };
      }
    },
  }),

  updateTodo: tool({
    description:
      "Update an existing to-do item's properties (description, project, tags, priority, or due date). CRITICAL: When a user wants to update a to-do item but doesn't provide the exact ID, you must first call getTodos to retrieve the current list, then semantically match the to-do item they're referring to, and use the exact 'id' field from that response. Never ask the user for the ID - find it yourself by matching their description to the existing to-do items. After successfully updating, call getTodos again to show the user the updated list so they can see the changes.",
    parameters: z.object({
      todoId: z
        .string()
        .describe(
          "The exact database ID from getTodos response (e.g., 'j97abc123xyz') - NOT a simple number. If you don't have this, call getTodos first to find the matching item."
        ),
      description: z.string().optional().describe("New task description"),
      project: z.string().optional().describe("New project name"),
      tags: z.array(z.string()).optional().describe("New tags array"),
      priority: z
        .enum(["low", "medium", "high"])
        .optional()
        .describe("New priority level"),
      dueDate: z
        .string()
        .optional()
        .describe(
          "New due date in ISO format (e.g., '2024-01-15') or null to remove"
        ),
    }),
    execute: async ({
      todoId,
      description,
      project,
      tags,
      priority,
      dueDate,
    }) => {
      try {
        console.log("🛠️ [TOOL] updateTodo called:", {
          todoId,
          description,
          project,
          tags,
          priority,
          dueDate,
        });

        const { userId } = await auth();
        if (!userId) {
          throw new Error("User not authenticated");
        }

        // Parse due date if provided
        let dueDateTimestamp: number | undefined;
        if (dueDate) {
          const parsedDate = new Date(dueDate);
          if (isNaN(parsedDate.getTime())) {
            throw new Error("Invalid date format provided");
          }
          dueDateTimestamp = parsedDate.getTime();
        }

        await convex.mutation(api.todos.updateTodo, {
          todoId: todoId as Id<"todos">,
          userId,
          description,
          project,
          tags,
          priority,
          dueDate: dueDateTimestamp,
        });

        console.log("✅ [TOOL] Todo updated successfully");
        return {
          success: true,
          message: `Successfully updated to-do item${
            description ? ` with new description: "${description}"` : ""
          }`,
        };
      } catch (error) {
        console.error("❌ [TOOL] Failed to update todo:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to update to-do",
        };
      }
    },
  }),

  getTodos: tool({
    description:
      "Get the user's to-do list, optionally filtered by completion status or project. CRITICAL: Always check this tool for the latest updates instead of relying on chat message history. When displaying results, use these formatting guidelines:\n\n**Default Display:** Always use the Simplified View unless the user specifically requests the Complete View.\n\n**For Simplified View:**\n- Use markdown list formatting (with dashes)\n- Format each item as: - [Status Emoji] Description\n- Status: ✅ (completed) or 🔴 (not completed)\n- Do NOT show IDs in simplified view\n- Example: - 🔴 Fix the login bug\n\n**For Complete View:**\n- Format description as h3 heading with status emoji: ### [Status Emoji] Description\n- Below the heading, display details in bullet list format:\n  - Project: [project name]\n  - Tags: [tag1, tag2, ...]\n  - Priority: [priority level]\n  - Due Date: [date with urgency emoji]\n  - ID: [todo ID]\n- Due Date Urgency: ⚠️ (overdue), 🔥 (due today), ⏰ (due soon), 📅 (future due date)\n- Group by project or priority when helpful\n\nAlways format lists in a clean, readable manner with proper line breaks between items.",
    parameters: z.object({
      completed: z
        .boolean()
        .optional()
        .describe(
          "Filter by completion status (true for completed, false for pending)"
        ),
      project: z.string().optional().describe("Filter by project name"),
    }),
    execute: async ({ completed, project }) => {
      try {
        console.log("🛠️ [TOOL] getTodos called:", { completed, project });

        const { userId } = await auth();
        if (!userId) {
          throw new Error("User not authenticated");
        }

        const todos = await convex.query(api.todos.getTodos, {
          userId,
          completed,
          project,
        });

        console.log("✅ [TOOL] Retrieved", todos.length, "todos");

        const formattedTodos = todos.map((todo) => ({
          id: todo._id,
          description: todo.description,
          completed: todo.completed,
          project: todo.project,
          tags: todo.tags,
          priority: todo.priority,
          dueDate: todo.dueDate
            ? new Date(todo.dueDate).toISOString().split("T")[0]
            : undefined,
          createdAt: new Date(todo._creationTime).toISOString().split("T")[0],
        }));

        return {
          success: true,
          todos: formattedTodos,
          count: todos.length,
          message: `Found ${todos.length} to-do${
            todos.length !== 1 ? "s" : ""
          }${
            completed !== undefined
              ? completed
                ? " (completed)"
                : " (pending)"
              : ""
          }${project ? ` in project "${project}"` : ""}`,
        };
      } catch (error) {
        console.error("❌ [TOOL] Failed to get todos:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to retrieve to-dos",
        };
      }
    },
  }),

  toggleTodo: tool({
    description:
      "Mark a to-do item as complete or incomplete. CRITICAL: You must first call getTodos to retrieve the current list and use the exact 'id' field from that response. Never guess or use simple numbers as todoId. After successfully toggling, call getTodos again to show the user the updated list so they can see the changes.",
    parameters: z.object({
      todoId: z
        .string()
        .describe(
          "The exact database ID from getTodos response (e.g., 'j97abc123xyz') - NOT a simple number"
        ),
      completed: z
        .boolean()
        .describe(
          "Set to true to mark as completed, false to mark as incomplete"
        ),
    }),
    execute: async ({ todoId, completed }) => {
      try {
        console.log("🛠️ [TOOL] toggleTodo called:", { todoId, completed });

        const { userId } = await auth();
        if (!userId) {
          throw new Error("User not authenticated");
        }

        await convex.mutation(api.todos.toggleTodo, {
          todoId: todoId as Id<"todos">,
          userId,
          completed,
        });

        console.log("✅ [TOOL] Todo toggled successfully");
        return {
          success: true,
          message: `Successfully marked to-do as ${
            completed ? "completed" : "incomplete"
          }`,
        };
      } catch (error) {
        console.error("❌ [TOOL] Failed to toggle todo:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to update to-do",
        };
      }
    },
  }),

  deleteTodo: tool({
    description:
      "Delete a to-do item permanently. CRITICAL: When a user wants to delete a to-do item but doesn't provide the exact ID, you must first call getTodos to retrieve the current list, then semantically match the to-do item they're referring to, and use the exact 'id' field from that response. Never ask the user for the ID - find it yourself by matching their description to the existing to-do items. After successfully deleting, call getTodos again to show the user the updated list so they can confirm the deletion.",
    parameters: z.object({
      todoId: z
        .string()
        .describe(
          "The exact database ID from getTodos response (e.g., 'j97abc123xyz') - NOT a simple number. If you don't have this, call getTodos first to find the matching item."
        ),
    }),
    execute: async ({ todoId }) => {
      try {
        console.log("🛠️ [TOOL] deleteTodo called:", { todoId });

        const { userId } = await auth();
        if (!userId) {
          throw new Error("User not authenticated");
        }

        await convex.mutation(api.todos.deleteTodo, {
          todoId: todoId as Id<"todos">,
          userId,
        });

        console.log("✅ [TOOL] Todo deleted successfully");
        return {
          success: true,
          message: "Successfully deleted the to-do item",
        };
      } catch (error) {
        console.error("❌ [TOOL] Failed to delete todo:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to delete to-do",
        };
      }
    },
  }),

  getProjects: tool({
    description:
      "Get all project names that the user has assigned to their to-dos",
    parameters: z.object({}),
    execute: async () => {
      try {
        console.log("🛠️ [TOOL] getProjects called");

        const { userId } = await auth();
        if (!userId) {
          throw new Error("User not authenticated");
        }

        const projects = await convex.query(api.todos.getProjects, {
          userId,
        });

        console.log("✅ [TOOL] Retrieved", projects.length, "projects");
        return {
          success: true,
          projects,
          count: projects.length,
          message: `Found ${projects.length} project${
            projects.length !== 1 ? "s" : ""
          }`,
        };
      } catch (error) {
        console.error("❌ [TOOL] Failed to get projects:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to retrieve projects",
        };
      }
    },
  }),

  getTags: tool({
    description: "Get all tags that the user has assigned to their to-dos",
    parameters: z.object({}),
    execute: async () => {
      try {
        console.log("🛠️ [TOOL] getTags called");

        const { userId } = await auth();
        if (!userId) {
          throw new Error("User not authenticated");
        }

        const tags = await convex.query(api.todos.getTags, {
          userId,
        });

        console.log("✅ [TOOL] Retrieved", tags.length, "tags");
        return {
          success: true,
          tags,
          count: tags.length,
          message: `Found ${tags.length} tag${tags.length !== 1 ? "s" : ""}`,
        };
      } catch (error) {
        console.error("❌ [TOOL] Failed to get tags:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to retrieve tags",
        };
      }
    },
  }),
};

export async function POST(req: Request) {
  try {
    // Parse and validate request body
    let newUserMessage: Message | undefined;
    let selectedModelId: string | undefined;
    let chatId: string | undefined;

    try {
      const body = await req.json();

      // Handle the new request format from experimental_prepareRequestBody
      if (body.newMessage) {
        // New format: server-side history management for authenticated users
        newUserMessage = body.newMessage;
        selectedModelId = body.model;
        chatId = body.chatId;
        console.log(
          "📦 [SERVER] New format - authenticated user with chatId:",
          chatId
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Get user info for authenticated users
    const { userId: authUserId } = await auth();

    // Prepare messages for AI processing
    let messagesToSend: CoreMessage[] = [];

    if (authUserId && chatId && newUserMessage) {
      try {
        // 🔥 SERVER-SIDE HISTORY MANAGEMENT FOR AUTHENTICATED USERS
        console.log(
          "📥 [SERVER] Loading previous messages from database for chat:",
          chatId
        );

        const previousMessages = await convex.query(api.messages.getMessages, {
          chatId: chatId as Id<"chats">,
        });

        console.log(
          "✅ [SERVER] Loaded",
          previousMessages.length,
          "previous messages"
        );

        // Convert Convex messages to Message format
        const previousUIMessages: Message[] = previousMessages.map(
          (msg, index) => ({
            id: `msg-${index}`, // Generate IDs for UI messages
            role: msg.role as "user" | "assistant",
            content: msg.body,
          })
        );

        // 🔥 Use appendClientMessage to combine database history with new user message
        const combinedUIMessages = appendClientMessage({
          messages: previousUIMessages,
          message: newUserMessage,
        });

        // Convert combined UI messages to CoreMessage format for streamText
        messagesToSend = convertToCoreMessages(combinedUIMessages);

        console.log(
          "🔄 [SERVER] Combined",
          previousUIMessages.length,
          "previous messages with new user message"
        );
        console.log(
          "📤 [SERVER] Total messages to send to AI:",
          messagesToSend.length
        );

        // Save the new user message to database
        await convex.mutation(api.messages.saveMessage, {
          chatId: chatId as Id<"chats">,
          userId: authUserId,
          role: "user",
          body: newUserMessage.content as string,
        });
        console.log("✅ [SERVER] User message saved to database");
      } catch (error) {
        console.error(
          "❌ [SERVER] Failed to load previous messages or save user message:",
          error
        );
        // Fallback to using just the new message if database operations fail
        messagesToSend = convertToCoreMessages([newUserMessage]);
      }
    } else {
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 }
      );
    }

    // Use selected model or fallback to default
    let selectedModel:
      | ReturnType<typeof getModelById>
      | ReturnType<typeof getDefaultModel>;

    if (selectedModelId) {
      const requestedModel = getModelById(selectedModelId);

      // Authenticated users - validate that the model exists and is available
      if (requestedModel && requestedModel.available) {
        selectedModel = requestedModel;
      } else {
        // Fall back to default model if requested model is unavailable or doesn't exist
        selectedModel = getDefaultModel();
      }
    } else {
      // No model specified - use appropriate default
      selectedModel = getDefaultModel();
    }

    // Ensure selectedModel is defined before accessing its id
    if (!selectedModel) {
      return NextResponse.json(
        { error: "No available model found" },
        { status: 400 }
      );
    }

    const modelId = selectedModel.id;

    // 🔥 RESUMABLE STREAMS: For authenticated users only
    if (authUserId && chatId) {
      // Generate a unique stream ID for this generation
      const streamId = generateId();

      // Record this new stream so we can resume later
      await convex.mutation(api.messages.appendStreamId, {
        chatId: chatId as Id<"chats">,
        streamId,
        userId: authUserId,
      });

      console.log("🎬 [SERVER] Created resumable stream:", streamId);

      // Build the data stream that will emit tokens
      const stream = createDataStream({
        execute: (dataStream) => {
          const result = streamText({
            model: openrouter(modelId),
            messages: messagesToSend,
            system:
              "You are an AI assistant with powerful to-do management capabilities and generative UI features. You help users by providing clear, accurate, and helpful responses across a wide range of topics. You can assist with coding problems, explain concepts, help with learning, provide creative solutions, and engage in meaningful conversations. Additionally, you have access to comprehensive to-do management tools that can both manage tasks and display them in beautiful, interactive user interfaces. When users mention tasks, to-dos, reminders, or things they need to do, proactively offer to help them manage these items. When users want to view their todos, use the displayTodosUI tool to show them in a beautiful table format with all details like priority, due dates, projects, and tags. Be concise yet thorough, and always aim to be useful and informative. If you're unsure about something, acknowledge it honestly and suggest alternatives or ways to find the information.",
            temperature: 0.7,
            // 🛠️ Add to-do management tools and generative UI tools for authenticated users
            tools: { ...todoTools, ...aiTools },
            maxSteps: 5, // Allow multiple tool calls in sequence
            // 🔥 ADD SMOOTH STREAMING for better UI rendering
            experimental_transform: smoothStream({
              delayInMs: 10,
              chunking: "word",
            }),
            onFinish: async (finishResult) => {
              try {
                // 🔥 APPEND RESPONSE MESSAGES - Enhanced for Future Tool Calls
                //
                // This implementation prepares for future AI function calling capabilities:
                // 1. Uses appendResponseMessages to properly combine conversation history with AI responses
                // 2. Preserves the full message structure including potential tool calls, function calls, etc.
                // 3. Currently saves text response for compatibility, but structure is ready for:
                //    - Tool call messages (function_call type)
                //    - Tool result messages (tool_result type)
                //    - Multi-modal content (images, files, etc.)
                //    - Structured data and metadata
                // 4. Future enhancement: Save full updatedMessages array to support conversation resume
                //    with complete context including tool interactions
                const updatedMessages = appendResponseMessages({
                  messages: messagesToSend.map((msg, index) => ({
                    id: `msg-${index}`,
                    role: msg.role as "user" | "assistant",
                    content:
                      typeof msg.content === "string"
                        ? msg.content
                        : msg.content
                            ?.map((part) =>
                              part.type === "text" ? part.text : ""
                            )
                            .join("") || "",
                  })),
                  responseMessages: finishResult.response.messages,
                });

                // For now, we'll still save just the text response to maintain compatibility
                // In the future, this will be enhanced to save the full message structure
                // including tool calls, function calls, and richer content types
                if (finishResult.text) {
                  await convex.mutation(api.messages.saveMessage, {
                    chatId: chatId as Id<"chats">,
                    userId: authUserId,
                    role: "assistant",
                    body: finishResult.text,
                  });
                  console.log("✅ [SERVER] AI response saved to database");
                  console.log("🔥 [SERVER] appendResponseMessages processed:", {
                    originalMessageCount: messagesToSend.length,
                    updatedMessageCount: updatedMessages.length,
                    responseMessageCount: finishResult.response.messages.length,
                    responseMessageTypes: finishResult.response.messages.map(
                      (msg) => msg.role
                    ),
                    hasToolCalls: finishResult.response.messages.some(
                      (msg) =>
                        Array.isArray(msg.content) &&
                        msg.content.some((part) => part.type === "tool-call")
                    ),
                  });
                }

                // Mark stream as inactive when complete
                await convex.mutation(api.messages.markStreamInactive, {
                  streamId,
                });
                console.log("🏁 [SERVER] Stream marked as complete:", streamId);
              } catch (error) {
                console.error("❌ [SERVER] Failed to save AI response:", error);
              }
            },
          });

          // Merge the result into the data stream
          result.mergeIntoDataStream(dataStream);
        },
      });

      // Return a resumable stream to the client
      return new Response(
        await streamContext.resumableStream(streamId, () => stream)
      );
    }
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      { error: "Internal server error occurred while processing your request" },
      { status: 500 }
    );
  }
}

/**
 * GET handler for resuming chat streams
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");

    if (!chatId) {
      return new Response("chatId is required", { status: 400 });
    }

    // Get user info for authenticated users only
    const { userId } = await auth();
    if (!userId) {
      return new Response("Authentication required for stream resumption", {
        status: 401,
      });
    }

    // Load stream IDs for this chat
    const streamIds = await convex.query(api.messages.loadStreams, {
      chatId: chatId as Id<"chats">,
    });

    if (!streamIds.length) {
      return new Response("No streams found", { status: 404 });
    }

    const recentStreamId = streamIds.at(-1);

    if (!recentStreamId) {
      return new Response("No recent stream found", { status: 404 });
    }

    console.log("🔄 [SERVER] Attempting to resume stream:", recentStreamId);

    // Create an empty data stream as fallback
    const emptyDataStream = createDataStream({
      execute: () => {},
    });

    // Try to resume the stream
    const stream = await streamContext.resumableStream(
      recentStreamId,
      () => emptyDataStream
    );

    if (stream) {
      console.log("✅ [SERVER] Successfully resumed stream:", recentStreamId);
      return new Response(stream, { status: 200 });
    }

    /*
     * For when the generation is "active" during SSR but the
     * resumable stream has concluded after reaching this point.
     */
    console.log("🔚 [SERVER] Stream has concluded, loading last message");

    const messages = await convex.query(api.messages.getMessages, {
      chatId: chatId as Id<"chats">,
    });

    const mostRecentMessage = messages.at(-1);

    if (!mostRecentMessage || mostRecentMessage.role !== "assistant") {
      console.log("📭 [SERVER] No recent assistant message found");
      return new Response(emptyDataStream, { status: 200 });
    }

    console.log("📬 [SERVER] Returning completed message");

    // Create a stream with the completed message
    const streamWithMessage = createDataStream({
      execute: (buffer) => {
        buffer.writeData({
          type: "append-message",
          message: JSON.stringify({
            id: mostRecentMessage._id,
            role: mostRecentMessage.role,
            content: mostRecentMessage.body,
            createdAt: mostRecentMessage._creationTime,
          }),
        });
      },
    });

    return new Response(streamWithMessage, { status: 200 });
  } catch (error) {
    console.error("❌ [SERVER] Error in GET handler:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
