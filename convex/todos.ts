import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new to-do item
export const createTodo = mutation({
  args: {
    userId: v.string(),
    description: v.string(),
    project: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
    dueDate: v.optional(v.number()),
  },
  returns: v.id("todos"),
  handler: async (ctx, args) => {
    console.log("🆕 [CONVEX] createTodo called with args:", {
      userId: args.userId,
      description: args.description,
      project: args.project,
      tags: args.tags,
      priority: args.priority,
    });

    try {
      const todoId = await ctx.db.insert("todos", {
        userId: args.userId,
        description: args.description,
        completed: false,
        project: args.project,
        tags: args.tags,
        priority: args.priority,
        dueDate: args.dueDate,
      });

      console.log("✅ [CONVEX] Todo created successfully with ID:", todoId);
      return todoId;
    } catch (error) {
      console.error("❌ [CONVEX] Failed to create todo:", error);
      throw error;
    }
  },
});

// Get all todos for a user
export const getTodos = query({
  args: {
    userId: v.string(),
    completed: v.optional(v.boolean()),
    project: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      _id: v.id("todos"),
      _creationTime: v.number(),
      userId: v.string(),
      description: v.string(),
      completed: v.boolean(),
      project: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      priority: v.optional(
        v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
      ),
      dueDate: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    console.log("📋 [CONVEX] getTodos called for userId:", args.userId);

    try {
      // Choose the most specific index based on filters
      let query;
      if (args.completed !== undefined && args.project !== undefined) {
        // You'll need a compound index for this case or filter in memory
        query = ctx.db
          .query("todos")
          .withIndex("by_user", (q) => q.eq("userId", args.userId))
          .filter((q) =>
            q.and(
              q.eq(q.field("completed"), args.completed),
              q.eq(q.field("project"), args.project)
            )
          );
      } else if (args.completed !== undefined) {
        query = ctx.db
          .query("todos")
          .withIndex("by_user_completed", (q) =>
            q.eq("userId", args.userId).eq("completed", args.completed!)
          );
      } else if (args.project !== undefined) {
        query = ctx.db
          .query("todos")
          .withIndex("by_user_project", (q) =>
            q.eq("userId", args.userId).eq("project", args.project)
          );
      } else {
        query = ctx.db
          .query("todos")
          .withIndex("by_user", (q) => q.eq("userId", args.userId));
      }

      const todos = await query.order("desc").collect();

      console.log("✅ [CONVEX] Found", todos.length, "todos for user");
      return todos;
    } catch (error) {
      console.error("❌ [CONVEX] Failed to get todos:", error);
      throw error;
    }
  },
});

// Update a todo's completion status
export const toggleTodo = mutation({
  args: {
    todoId: v.id("todos"),
    userId: v.string(),
    completed: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("✅ [CONVEX] toggleTodo called with args:", args);

    try {
      // First, verify the todo exists and belongs to the user
      const todo = await ctx.db.get(args.todoId);
      if (!todo) {
        console.error("❌ [CONVEX] Todo not found:", args.todoId);
        throw new Error(`Todo not found: ${args.todoId}`);
      }

      if (todo.userId !== args.userId) {
        console.error("❌ [CONVEX] Unauthorized access to todo:", args.todoId);
        throw new Error("Unauthorized access to todo");
      }

      await ctx.db.patch(args.todoId, {
        completed: args.completed,
      });

      console.log("✅ [CONVEX] Todo completion status updated successfully");
      return null;
    } catch (error) {
      console.error("❌ [CONVEX] Failed to toggle todo:", error);
      throw error;
    }
  },
});

// Update a todo item
export const updateTodo = mutation({
  args: {
    todoId: v.id("todos"),
    userId: v.string(),
    description: v.optional(v.string()),
    project: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
    dueDate: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("🔄 [CONVEX] updateTodo called with args:", args);

    try {
      // First, verify the todo exists and belongs to the user
      const todo = await ctx.db.get(args.todoId);
      if (!todo) {
        console.error("❌ [CONVEX] Todo not found:", args.todoId);
        throw new Error(`Todo not found: ${args.todoId}`);
      }

      if (todo.userId !== args.userId) {
        console.error("❌ [CONVEX] Unauthorized access to todo:", args.todoId);
        throw new Error("Unauthorized access to todo");
      }

      // Build update object with only provided fields
      const updateData: Partial<{
        description: string;
        project: string | undefined;
        tags: string[] | undefined;
        priority: "low" | "medium" | "high" | undefined;
        dueDate: number | undefined;
      }> = {};
      if (args.description !== undefined)
        updateData.description = args.description;
      if (args.project !== undefined) updateData.project = args.project;
      if (args.tags !== undefined) updateData.tags = args.tags;
      if (args.priority !== undefined) updateData.priority = args.priority;
      if (args.dueDate !== undefined) updateData.dueDate = args.dueDate;

      await ctx.db.patch(args.todoId, updateData);

      console.log("✅ [CONVEX] Todo updated successfully");
      return null;
    } catch (error) {
      console.error("❌ [CONVEX] Failed to update todo:", error);
      throw error;
    }
  },
});

// Delete a todo item
export const deleteTodo = mutation({
  args: {
    todoId: v.id("todos"),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("🗑️ [CONVEX] deleteTodo called with args:", args);

    try {
      // First, verify the todo exists and belongs to the user
      const todo = await ctx.db.get(args.todoId);
      if (!todo) {
        console.error("❌ [CONVEX] Todo not found:", args.todoId);
        throw new Error(`Todo not found: ${args.todoId}`);
      }

      if (todo.userId !== args.userId) {
        console.error("❌ [CONVEX] Unauthorized access to todo:", args.todoId);
        throw new Error("Unauthorized access to todo");
      }

      await ctx.db.delete(args.todoId);

      console.log("✅ [CONVEX] Todo deleted successfully");
      return null;
    } catch (error) {
      console.error("❌ [CONVEX] Failed to delete todo:", error);
      throw error;
    }
  },
});

// Get projects for a user (distinct project names)
export const getProjects = query({
  args: {
    userId: v.string(),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    console.log("📁 [CONVEX] getProjects called for userId:", args.userId);

    try {
      const todos = await ctx.db
        .query("todos")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();

      // Extract unique project names (excluding null/undefined)
      const projects = Array.from(
        new Set(
          todos
            .map((todo) => todo.project)
            .filter(
              (project): project is string =>
                project !== undefined && project !== null
            )
        )
      );

      console.log("✅ [CONVEX] Found", projects.length, "projects for user");
      return projects;
    } catch (error) {
      console.error("❌ [CONVEX] Failed to get projects:", error);
      throw error;
    }
  },
});

// Get all tags for a user (distinct tag names)
export const getTags = query({
  args: {
    userId: v.string(),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    console.log("🏷️ [CONVEX] getTags called for userId:", args.userId);

    try {
      const todos = await ctx.db
        .query("todos")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();

      // Extract unique tags from all todos
      const allTags = todos
        .flatMap((todo) => todo.tags || [])
        .filter((tag): tag is string => tag !== undefined && tag !== null);

      const uniqueTags = Array.from(new Set(allTags));

      console.log(
        "✅ [CONVEX] Found",
        uniqueTags.length,
        "unique tags for user"
      );
      return uniqueTags;
    } catch (error) {
      console.error("❌ [CONVEX] Failed to get tags:", error);
      throw error;
    }
  },
});
