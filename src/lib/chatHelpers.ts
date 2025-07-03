import { type Message } from "@ai-sdk/react";
import { MAX_CHAT_TITLE_LENGTH, DEFAULT_CHAT_TITLE } from "./constants";

// ────────────────────────────────────────────────────────────────────────────────
// 📝 Chat Title Functions
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Generate a chat title from message content
 * @param content - The message content to create a title from
 * @param maxLength - Maximum length of the title (default: from constants)
 * @returns Truncated title with ellipsis if needed
 */
export const generateChatTitle = (
  content: string,
  maxLength: number = MAX_CHAT_TITLE_LENGTH
): string => {
  if (!content.trim()) return DEFAULT_CHAT_TITLE;

  const title = content.trim();
  return title.length > maxLength ? title.slice(0, maxLength) + "..." : title;
};

// ────────────────────────────────────────────────────────────────────────────────
// 💬 Message Creation Functions
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Create a user message object
 * @param content - The message content
 * @param customId - Optional custom ID (defaults to timestamp-based)
 * @returns Message object with user role
 */
export const createUserMessage = (
  content: string,
  customId?: string
): Message => {
  return {
    id: customId || `${Date.now()}_user`,
    role: "user",
    content: content.trim(),
    createdAt: new Date(),
  };
};

/**
 * Create an assistant message object
 * @param content - The message content
 * @param customId - Optional custom ID (defaults to timestamp-based)
 * @returns Message object with assistant role
 */
export const createAssistantMessage = (
  content: string,
  customId?: string
): Message => {
  return {
    id: customId || `${Date.now()}_assistant`,
    role: "assistant",
    content: content.trim(),
    createdAt: new Date(),
  };
};

// ────────────────────────────────────────────────────────────────────────────────
// 🔒 Convex Chat Functions
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Check if a chat ID is a valid Convex database ID
 * @param id - The chat ID to check
 * @returns True if the ID appears to be a valid Convex ID
 */
export const isConvexChatId = (id: string | null | undefined): boolean => {
  if (!id || typeof id !== "string") return false;
  return id.length > 10;
};

// ────────────────────────────────────────────────────────────────────────────────
// 🧮 Convex Usage Functions
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Check if user has reached their message limit
 * @param currentCount - Current AI message count
 * @param limit - Maximum allowed messages
 * @returns True if limit is reached or exceeded
 */
export const isLimitReached = (
  currentCount: number,
  limit: number
): boolean => {
  return currentCount >= limit;
};

// ────────────────────────────────────────────────────────────────────────────────
// 🔧 LocalStorage Helper Functions
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Safely get a number from localStorage
 * @param key - The localStorage key
 * @param defaultValue - Default value if key doesn't exist or is invalid
 * @returns The parsed number or default value
 */
export const getNumberFromStorage = (
  key: string,
  defaultValue: number = 0
): number => {
  if (typeof window === "undefined") return defaultValue;

  try {
    const value = localStorage.getItem(key);
    const parsed = value ? parseInt(value, 10) : defaultValue;
    return isNaN(parsed) ? defaultValue : parsed;
  } catch {
    return defaultValue;
  }
};

/**
 * Safely set a number in localStorage
 * @param key - The localStorage key
 * @param value - The number value to store
 */
export const setNumberInStorage = (key: string, value: number): void => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(key, value.toString());
  } catch (error) {
    console.warn(`Failed to save to localStorage (${key}):`, error);
  }
};

/**
 * Safely get an object from localStorage
 * @param key - The localStorage key
 * @param defaultValue - Default value if key doesn't exist or is invalid
 * @returns The parsed object or default value
 */
export const getObjectFromStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === "undefined") return defaultValue;

  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
  } catch {
    return defaultValue;
  }
};

/**
 * Safely set an object in localStorage
 * @param key - The localStorage key
 * @param value - The object to store
 */
export const setObjectInStorage = <T>(key: string, value: T): void => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to save to localStorage (${key}):`, error);
  }
};

/**
 * Safely get a string from localStorage
 * @param key - The localStorage key
 * @param defaultValue - Default value if key doesn't exist
 * @returns The stored string or default value
 */
export const getStringFromStorage = (
  key: string,
  defaultValue: string = ""
): string => {
  if (typeof window === "undefined") return defaultValue;

  try {
    const value = localStorage.getItem(key);
    return value ?? defaultValue;
  } catch {
    return defaultValue;
  }
};

/**
 * Safely set a string in localStorage
 * @param key - The localStorage key
 * @param value - The string value to store
 */
export const setStringInStorage = (key: string, value: string): void => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Failed to save to localStorage (${key}):`, error);
  }
};
