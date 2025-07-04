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

// Get all chats for a user sorted by last message time (most recent first)
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
        .withIndex("by_user_last_message", (q) => q.eq("userId", args.userId))
        .order("desc")
        .collect();

      console.log(
        "✅ [CONVEX] Found",
        chats.length,
        "chats for user, sorted by last message time"
      );
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
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("tool")),
    body: v.string(),
    // Tool-related fields following AI SDK pattern
    toolCallId: v.optional(v.string()),
    toolName: v.optional(v.string()),
    toolArgs: v.optional(v.any()),
    toolResult: v.optional(v.any()),
    // Legacy fields for backwards compatibility
    parts: v.optional(
      v.array(
        v.object({
          type: v.union(
            v.literal("text"),
            v.literal("tool-call"),
            v.literal("tool-result")
          ),
          text: v.optional(v.string()),
          toolCallId: v.optional(v.string()),
          toolName: v.optional(v.string()),
          args: v.optional(v.any()),
          result: v.optional(v.any()),
        })
      )
    ),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    console.log("💾 [CONVEX] saveMessage called with args:", {
      chatId: args.chatId,
      userId: args.userId,
      role: args.role,
      bodyLength: args.body.length,
      bodyPreview: args.body.slice(0, 50) + "...",
      hasToolCall: !!(args.toolCallId && args.toolName),
      hasToolResult: !!args.toolResult,
      hasParts: !!args.parts?.length,
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

      // Insert the message with tool information
      console.log("📝 [CONVEX] Inserting message...");
      const messageId = await ctx.db.insert("messages", {
        chatId: args.chatId,
        userId: args.userId,
        role: args.role,
        body: args.body,
        toolCallId: args.toolCallId,
        toolName: args.toolName,
        toolArgs: args.toolArgs,
        toolResult: args.toolResult,
        parts: args.parts,
      });

      console.log("✅ [CONVEX] Message saved successfully with ID:", messageId);
      if (args.toolCallId) {
        console.log("🛠️ [CONVEX] Saved tool message:", {
          toolName: args.toolName,
          hasArgs: !!args.toolArgs,
          hasResult: !!args.toolResult,
        });
      }
      return messageId;
    } catch (error) {
      console.error("❌ [CONVEX] Failed to save message:", error);
      throw error;
    }
  },
});

// Add a specialized function for saving AI SDK messages with full structure
export const saveRichMessage = mutation({
  args: {
    chatId: v.id("chats"),
    userId: v.string(),
    message: v.object({
      id: v.string(),
      role: v.union(
        v.literal("user"),
        v.literal("assistant"),
        v.literal("tool")
      ),
      content: v.optional(v.string()),
      parts: v.optional(v.array(v.any())),
      createdAt: v.optional(v.any()),
    }),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    console.log("🎨 [CONVEX] saveRichMessage called with message:", {
      id: args.message.id,
      role: args.message.role,
      hasContent: !!args.message.content,
      hasParts: !!args.message.parts?.length,
      partsCount: args.message.parts?.length || 0,
    });

    try {
      // Verify the chat exists
      const chat = await ctx.db.get(args.chatId);
      if (!chat) {
        throw new Error(`Chat not found: ${args.chatId}`);
      }

      // Update the chat's last message time
      await ctx.db.patch(args.chatId, {
        lastMessageTime: Date.now(),
      });

      // Insert the message with full structure
      const messageId = await ctx.db.insert("messages", {
        chatId: args.chatId,
        userId: args.userId,
        role: args.message.role,
        body: args.message.content || "",
        parts: args.message.parts || undefined,
      });

      console.log("✅ [CONVEX] Rich message saved successfully");
      return messageId;
    } catch (error) {
      console.error("❌ [CONVEX] Failed to save rich message:", error);
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
      role: v.union(
        v.literal("user"),
        v.literal("assistant"),
        v.literal("tool")
      ),
      body: v.string(),
      // Tool-related fields following AI SDK pattern
      toolCallId: v.optional(v.string()),
      toolName: v.optional(v.string()),
      toolArgs: v.optional(v.any()),
      toolResult: v.optional(v.any()),
      // Legacy fields for backwards compatibility
      parts: v.optional(
        v.array(
          v.object({
            type: v.union(
              v.literal("text"),
              v.literal("tool-call"),
              v.literal("tool-result"),
              v.literal("tool-invocation"),
              v.literal("step-start"),
              v.literal("step-finish"),
              v.literal("step-result")
            ),
            text: v.optional(v.string()),
            toolCallId: v.optional(v.string()),
            toolName: v.optional(v.string()),
            args: v.optional(v.any()),
            result: v.optional(v.any()),
            // Additional fields for new part types
            toolInvocation: v.optional(v.any()),
            stepType: v.optional(v.string()),
            stepResult: v.optional(v.any()),
          })
        )
      ),
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

/**
 * Append a stream ID to track resumable streams for a chat
 */
export const appendStreamId = mutation({
  args: {
    chatId: v.id("chats"),
    streamId: v.string(),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { chatId, streamId, userId }) => {
    // Mark any existing streams for this chat as inactive
    const existingStreams = await ctx.db
      .query("streams")
      .withIndex("by_chat_and_active", (q) =>
        q.eq("chatId", chatId).eq("isActive", true)
      )
      .collect();

    for (const stream of existingStreams) {
      await ctx.db.patch(stream._id, { isActive: false });
    }

    // Insert the new active stream
    await ctx.db.insert("streams", {
      chatId,
      streamId,
      userId,
      isActive: true,
    });

    return null;
  },
});

/**
 * Load the most recent stream IDs for a chat
 */
export const loadStreams = query({
  args: {
    chatId: v.id("chats"),
  },
  returns: v.array(v.string()),
  handler: async (ctx, { chatId }) => {
    const streams = await ctx.db
      .query("streams")
      .withIndex("by_chat", (q) => q.eq("chatId", chatId))
      .order("desc")
      .take(10); // Get last 10 streams

    return streams.map((stream) => stream.streamId);
  },
});

/**
 * Mark a stream as inactive when it completes
 */
export const markStreamInactive = mutation({
  args: {
    streamId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { streamId }) => {
    const stream = await ctx.db
      .query("streams")
      .withIndex("by_stream", (q) => q.eq("streamId", streamId))
      .first();

    if (stream) {
      await ctx.db.patch(stream._id, { isActive: false });
    }

    return null;
  },
});
