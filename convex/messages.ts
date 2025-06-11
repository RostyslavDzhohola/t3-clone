import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new chat
export const createChat = mutation({
  args: {
    userId: v.string(),
    title: v.string(),
  },
  returns: v.id("chats"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("chats", {
      userId: args.userId,
      title: args.title,
      lastMessageTime: Date.now(),
    });
  },
});

// Get all chats for a user
export const getChats = query({
  args: {
    userId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("chats"),
      _creationTime: v.number(),
      userId: v.string(),
      title: v.string(),
      lastMessageTime: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Save a message to a specific chat
export const saveMessage = mutation({
  args: {
    chatId: v.id("chats"),
    userId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    body: v.string(),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    // Update the chat's last message time
    await ctx.db.patch(args.chatId, {
      lastMessageTime: Date.now(),
    });

    return await ctx.db.insert("messages", {
      chatId: args.chatId,
      userId: args.userId,
      role: args.role,
      body: args.body,
    });
  },
});

// Get messages for a specific chat
export const getMessages = query({
  args: {
    chatId: v.id("chats"),
  },
  returns: v.array(
    v.object({
      _id: v.id("messages"),
      _creationTime: v.number(),
      chatId: v.id("chats"),
      userId: v.string(),
      role: v.union(v.literal("user"), v.literal("assistant")),
      body: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .order("asc")
      .collect();
  },
});

// Update chat title (useful for auto-generating titles from first message)
export const updateChatTitle = mutation({
  args: {
    chatId: v.id("chats"),
    title: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.chatId, {
      title: args.title,
    });
    return null;
  },
});
