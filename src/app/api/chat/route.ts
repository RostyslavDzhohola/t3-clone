import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openrouter("google/gemini-2.5-flash-preview-04-17"),
    messages,
  });

  return result.toDataStreamResponse();
}
