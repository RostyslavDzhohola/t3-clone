// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  chats: defineTable({
    userId: v.string(),
    title: v.string(),
    lastMessageTime: v.number(),
  }).index("by_user", ["userId"]),

  messages: defineTable({
    chatId: v.id("chats"),
    userId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    body: v.string(),
  }).index("by_chat", ["chatId"]),

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
});
