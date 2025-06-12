import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, type CoreMessage } from "ai";
import { getModelById, getDefaultModel } from "@/lib/models";
import { NextResponse } from "next/server";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export async function POST(req: Request) {
  try {
    // Parse and validate request body
    let messages: CoreMessage[];
    let selectedModelId: string | undefined;

    try {
      const body = await req.json();
      messages = body.messages;
      selectedModelId = body.model;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Use selected model or fallback to default
    let selectedModel:
      | ReturnType<typeof getModelById>
      | ReturnType<typeof getDefaultModel>;

    if (selectedModelId) {
      const requestedModel = getModelById(selectedModelId);
      // Validate that the model exists and is available
      if (requestedModel && requestedModel.available) {
        selectedModel = requestedModel;
      } else {
        // Fall back to default model if requested model is unavailable or doesn't exist
        selectedModel = getDefaultModel();
      }
    } else {
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

    // Call streamText with error handling
    const result = streamText({
      model: openrouter(modelId),
      messages,
      system:
        "You are an AI assistant in the T3.1 Chat Clone application. You help users by providing clear, accurate, and helpful responses to their questions across a wide range of topics. You can assist with coding problems, explain concepts, help with learning, provide creative solutions, and engage in meaningful conversations. Be concise yet thorough, and always aim to be useful and informative. If you're unsure about something, acknowledge it honestly and suggest alternatives or ways to find the information.",
      temperature: 0.7,
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
