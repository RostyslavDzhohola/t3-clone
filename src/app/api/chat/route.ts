import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";
import { getModelById, getDefaultModel } from "@/lib/models";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export async function POST(req: Request) {
  const { messages, model: selectedModelId } = await req.json();

  // Use selected model or fallback to default
  const selectedModel = selectedModelId
    ? getModelById(selectedModelId)
    : getDefaultModel();

  const modelId = selectedModel?.id || getDefaultModel().id;

  const result = streamText({
    model: openrouter(modelId),
    messages,
    system:
      "You are an AI assistant in the T3.1 Chat Clone application. You help users by providing clear, accurate, and helpful responses to their questions across a wide range of topics. You can assist with coding problems, explain concepts, help with learning, provide creative solutions, and engage in meaningful conversations. Be concise yet thorough, and always aim to be useful and informative. If you're unsure about something, acknowledge it honestly and suggest alternatives or ways to find the information.",
    temperature: 0.7,
  });

  return result.toDataStreamResponse();
}
