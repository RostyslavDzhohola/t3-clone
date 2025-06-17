import { type Message } from "@ai-sdk/react";

// ────────────────────────────────────────────────────────────────────────────────
// 🏷️ Shared Types
// ────────────────────────────────────────────────────────────────────────────────

export interface LocalStorageChat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

// ────────────────────────────────────────────────────────────────────────────────
// 🔢 Application Constants
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Maximum number of AI messages allowed for anonymous users
 */
export const ANONYMOUS_MESSAGE_LIMIT = 10;

/**
 * Maximum length for generated chat titles
 */
export const MAX_CHAT_TITLE_LENGTH = 30;

/**
 * Default chat title for empty messages
 */
export const DEFAULT_CHAT_TITLE = "New Chat";

// ────────────────────────────────────────────────────────────────────────────────
// 🔑 Storage Keys
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Keys for anonymous user localStorage data
 */
export const ANONYMOUS_STORAGE_KEYS = {
  MESSAGE_COUNT: "anonymous_message_count",
  AI_COUNT: "anonymous_ai_message_count",
  CHATS: "anonymous_chats",
  CURRENT_CHAT: "anonymous_current_chat",
} as const;

/**
 * Key for storing selected AI model
 */
export const MODEL_STORAGE_KEY = "selectedModel";
