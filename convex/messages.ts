import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const saveMessage = mutation({
  args: {
    role: v.union(v.literal("user"), v.literal("assistant")),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    // TODO: Get user identity and save the message
  },
});
