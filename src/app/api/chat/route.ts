import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  streamText,
  convertToCoreMessages,
  appendClientMessage,
  appendResponseMessages,
  smoothStream,
  createDataStream,
  generateId,
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
import { tools as unifiedTodoTools } from "@/ai/tools";

// Initialize Convex client for server-side usage
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

// Create resumable stream context
const streamContext = createResumableStreamContext({
  waitUntil: after,
});

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
            // 🛠️ Add unified to-do management and generative UI tools for authenticated users
            tools: unifiedTodoTools,
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
