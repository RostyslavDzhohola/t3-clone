/**
 * Configuration for available LLM models in the chat application
 */

export interface LLMModel {
  id: string;
  name: string;
  provider: string;
  available: boolean;
}

/**
 * List of all configured LLM models
 * To add new models: Add them here and ensure they're supported by OpenRouter
 */
export const AVAILABLE_MODELS: LLMModel[] = [
  {
    id: "google/gemini-2.5-flash-preview-04-17",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    available: true,
  },
  {
    id: "google/gemini-2.0-flash-001",
    name: "Gemini 2.0 Flash",
    provider: "Google",
    available: true,
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    available: false,
  },
  {
    id: "openai/gpt-4.1",
    name: "GPT-4.1",
    provider: "OpenAI",
    available: true,
  },
  {
    id: "openai/gpt-4o-2024-11-20",
    name: "GPT-4o (Nov 2024)",
    provider: "OpenAI",
    available: true,
  },
  {
    id: "openai/o4-mini",
    name: "GPT o4-mini",
    provider: "OpenAI",
    available: true,
  },
  {
    id: "x-ai/grok-3-mini-beta",
    name: "Grok 3 Mini Beta",
    provider: "xAI",
    available: true,
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B",
    provider: "Meta",
    available: true,
  },
  {
    id: "qwen/qwen3-235b-a22b",
    name: "Qwen 3 235B",
    provider: "Alibaba",
    available: true,
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    available: false,
  },
];

/**
 * Get a specific model by its ID
 */
export function getModelById(modelId: string): LLMModel | undefined {
  return AVAILABLE_MODELS.find((model) => model.id === modelId);
}

/**
 * Get only the models that are currently available/enabled
 */
export function getAvailableModels(): LLMModel[] {
  return AVAILABLE_MODELS.filter((model) => model.available);
}

/**
 * Get the default model (first available model)
 */
export function getDefaultModel(): LLMModel {
  const availableModels = getAvailableModels();
  if (availableModels.length > 0) return availableModels[0];
  throw new Error(
    "No available LLM models found – please check your AVAILABLE_MODELS configuration."
  );
}
