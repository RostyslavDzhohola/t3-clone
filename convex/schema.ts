// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  chats: defineTable({
    userId: v.string(),
    title: v.string(),
    lastMessageTime: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_last_message", ["userId", "lastMessageTime"]),

  messages: defineTable({
    chatId: v.id("chats"),
    userId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    body: v.string(),
  }).index("by_chat", ["chatId"]),

  // Resumable streams for chat continuity
  streams: defineTable({
    chatId: v.id("chats"),
    streamId: v.string(),
    userId: v.string(),
    isActive: v.boolean(),
    partialContent: v.optional(v.string()),
    tokenCount: v.optional(v.number()),
  })
    .index("by_chat", ["chatId"])
    .index("by_stream", ["streamId"])
    .index("by_chat_and_active", ["chatId", "isActive"]),

  // To-do items with user-specific access
  todos: defineTable({
    userId: v.string(),
    description: v.string(), // The main task description (what the user wants to do)
    completed: v.boolean(),
    project: v.optional(v.string()), // Optional project categorization
    tags: v.optional(v.array(v.string())), // Optional tags for categorization
    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
    dueDate: v.optional(v.number()), // Optional due date as timestamp
  })
    .index("by_user", ["userId"])
    .index("by_user_completed", ["userId", "completed"])
    .index("by_user_project", ["userId", "project"]),
});
