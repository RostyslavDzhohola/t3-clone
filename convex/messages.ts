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
    console.log("🆕 [CONVEX] createChat called with args:", args);

    try {
      const chatId = await ctx.db.insert("chats", {
        userId: args.userId,
        title: args.title,
        lastMessageTime: Date.now(),
      });

      console.log("✅ [CONVEX] Chat created successfully with ID:", chatId);
      return chatId;
    } catch (error) {
      console.error("❌ [CONVEX] Failed to create chat:", error);
      throw error;
    }
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
    console.log("📋 [CONVEX] getChats called for userId:", args.userId);

    try {
      const chats = await ctx.db
        .query("chats")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .order("desc")
        .collect();

      console.log("✅ [CONVEX] Found", chats.length, "chats for user");
      return chats;
    } catch (error) {
      console.error("❌ [CONVEX] Failed to get chats:", error);
      throw error;
    }
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
    console.log("💾 [CONVEX] saveMessage called with args:", {
      chatId: args.chatId,
      userId: args.userId,
      role: args.role,
      bodyLength: args.body.length,
      bodyPreview: args.body.slice(0, 50) + "...",
    });

    try {
      // First, verify the chat exists
      const chat = await ctx.db.get(args.chatId);
      if (!chat) {
        console.error("❌ [CONVEX] Chat not found:", args.chatId);
        throw new Error(`Chat not found: ${args.chatId}`);
      }
      console.log("✅ [CONVEX] Chat found:", chat.title);

      // Update the chat's last message time
      console.log("🕒 [CONVEX] Updating chat lastMessageTime...");
      await ctx.db.patch(args.chatId, {
        lastMessageTime: Date.now(),
      });
      console.log("✅ [CONVEX] Chat lastMessageTime updated");

      // Insert the message
      console.log("📝 [CONVEX] Inserting message...");
      const messageId = await ctx.db.insert("messages", {
        chatId: args.chatId,
        userId: args.userId,
        role: args.role,
        body: args.body,
      });

      console.log("✅ [CONVEX] Message saved successfully with ID:", messageId);
      return messageId;
    } catch (error) {
      console.error("❌ [CONVEX] Failed to save message:", error);
      throw error;
    }
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
    console.log("📨 [CONVEX] getMessages called for chatId:", args.chatId);

    try {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
        .order("asc")
        .collect();

      console.log("✅ [CONVEX] Found", messages.length, "messages for chat");
      return messages;
    } catch (error) {
      console.error("❌ [CONVEX] Failed to get messages:", error);
      throw error;
    }
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
    console.log("🏷️ [CONVEX] updateChatTitle called with args:", args);

    try {
      // Verify the chat exists first
      const chat = await ctx.db.get(args.chatId);
      if (!chat) {
        console.error(
          "❌ [CONVEX] Chat not found for title update:",
          args.chatId
        );
        throw new Error(`Chat not found: ${args.chatId}`);
      }

      await ctx.db.patch(args.chatId, {
        title: args.title,
      });

      console.log("✅ [CONVEX] Chat title updated successfully");
      return null;
    } catch (error) {
      console.error("❌ [CONVEX] Failed to update chat title:", error);
      throw error;
    }
  },
});

// Delete a chat and all its associated messages
export const deleteChat = mutation({
  args: {
    chatId: v.id("chats"),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("🗑️ [CONVEX] deleteChat called with args:", args);

    try {
      // First, verify the chat exists and belongs to the user
      const chat = await ctx.db.get(args.chatId);
      if (!chat) {
        console.error("❌ [CONVEX] Chat not found:", args.chatId);
        throw new Error(`Chat not found: ${args.chatId}`);
      }

      if (chat.userId !== args.userId) {
        console.error("❌ [CONVEX] Unauthorized access to chat:", args.chatId);
        throw new Error("Unauthorized access to chat");
      }

      console.log("✅ [CONVEX] Chat found and authorized:", chat.title);

      // Delete all messages in this chat
      console.log("🗑️ [CONVEX] Deleting messages for chat...");
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
        .collect();

      for (const message of messages) {
        await ctx.db.delete(message._id);
      }
      console.log(`✅ [CONVEX] Deleted ${messages.length} messages`);

      // Delete the chat itself
      console.log("🗑️ [CONVEX] Deleting chat...");
      await ctx.db.delete(args.chatId);

      console.log("✅ [CONVEX] Chat deleted successfully");
      return null;
    } catch (error) {
      console.error("❌ [CONVEX] Failed to delete chat:", error);
      throw error;
    }
  },
});
