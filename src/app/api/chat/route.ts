import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, type CoreMessage } from "ai";
import {
  getModelById,
  getDefaultModel,
  getDefaultAnonymousModel,
  isModelAvailableForAnonymous,
} from "@/lib/models";
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { auth } from "@clerk/nextjs/server";
import type { Id } from "../../../../convex/_generated/dataModel";

// Initialize Convex client for server-side usage
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const ANONYMOUS_MESSAGE_LIMIT = 10;

export async function POST(req: Request) {
  try {
    // Parse and validate request body
    let messages: CoreMessage[];
    let selectedModelId: string | undefined;
    let isAnonymous: boolean = false;
    let anonymousMessageCount: number = 0;
    let chatId: string | undefined;
    let userMessage: string | undefined;

    try {
      const body = await req.json();
      messages = body.messages;
      selectedModelId = body.model;
      isAnonymous = body.anonymous === true;
      anonymousMessageCount = body.anonymousMessageCount || 0;
      chatId = body.chatId;

      // Extract the latest user message for saving
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === "user") {
        userMessage = lastMessage.content as string;
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Check anonymous message limit using the total count from client
    if (isAnonymous) {
      // The client sends the total anonymous message count from localStorage
      // This includes all messages across all chats and sessions
      if (anonymousMessageCount >= ANONYMOUS_MESSAGE_LIMIT) {
        return NextResponse.json(
          { error: "Sorry, you've reached your rate limit" },
          { status: 429 }
        );
      }
    }

    // Get user info for authenticated users
    let userId: string | null = null;
    if (!isAnonymous) {
      const { userId: authUserId } = await auth();
      userId = authUserId;
    }

    // Save user message to database (for authenticated users only)
    if (!isAnonymous && userId && chatId && userMessage) {
      try {
        await convex.mutation(api.messages.saveMessage, {
          chatId: chatId as Id<"chats">,
          userId,
          role: "user",
          body: userMessage,
        });
        console.log("✅ User message saved to database");
      } catch (error) {
        console.error("❌ Failed to save user message:", error);
        // Continue with AI response even if saving fails
      }
    }

    // Use selected model or fallback to default
    let selectedModel:
      | ReturnType<typeof getModelById>
      | ReturnType<typeof getDefaultModel>
      | ReturnType<typeof getDefaultAnonymousModel>;

    if (selectedModelId) {
      const requestedModel = getModelById(selectedModelId);

      if (isAnonymous) {
        // Anonymous users can only use Gemini 2.5 Flash
        if (requestedModel && isModelAvailableForAnonymous(requestedModel.id)) {
          selectedModel = requestedModel;
        } else {
          // Force anonymous users to use Gemini 2.5 Flash
          selectedModel = getDefaultAnonymousModel();
        }
      } else {
        // Authenticated users - validate that the model exists and is available
        if (requestedModel && requestedModel.available) {
          selectedModel = requestedModel;
        } else {
          // Fall back to default model if requested model is unavailable or doesn't exist
          selectedModel = getDefaultModel();
        }
      }
    } else {
      // No model specified - use appropriate default
      selectedModel = isAnonymous
        ? getDefaultAnonymousModel()
        : getDefaultModel();
    }

    // Ensure selectedModel is defined before accessing its id
    if (!selectedModel) {
      return NextResponse.json(
        { error: "No available model found" },
        { status: 400 }
      );
    }

    const modelId = selectedModel.id;

    // Call streamText with error handling
    const result = streamText({
      model: openrouter(modelId),
      messages,
      system: isAnonymous
        ? "You are an AI assistant in the T3.1 Chat Clone application (Anonymous Mode). You help users by providing clear, accurate, and helpful responses to their questions across a wide range of topics. You can assist with coding problems, explain concepts, help with learning, provide creative solutions, and engage in meaningful conversations. Be concise yet thorough, and always aim to be useful and informative. If you're unsure about something, acknowledge it honestly and suggest alternatives or ways to find the information."
        : "You are an AI assistant in the T3.1 Chat Clone application. You help users by providing clear, accurate, and helpful responses to their questions across a wide range of topics. You can assist with coding problems, explain concepts, help with learning, provide creative solutions, and engage in meaningful conversations. Be concise yet thorough, and always aim to be useful and informative. If you're unsure about something, acknowledge it honestly and suggest alternatives or ways to find the information.",
      temperature: 0.7,
      onFinish: async (finishResult) => {
        // Save AI response to database (for authenticated users only)
        if (!isAnonymous && userId && chatId && finishResult.text) {
          try {
            await convex.mutation(api.messages.saveMessage, {
              chatId: chatId as Id<"chats">,
              userId,
              role: "assistant",
              body: finishResult.text,
            });
            console.log("✅ AI response saved to database");
          } catch (error) {
            console.error("❌ Failed to save AI response:", error);
          }
        }
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      { error: "Internal server error occurred while processing your request" },
      { status: 500 }
    );
  }
}
