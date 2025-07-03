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
 * Key for storing selected AI model
 */
export const MODEL_STORAGE_KEY = "selectedModel";
