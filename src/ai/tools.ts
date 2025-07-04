import { tool } from "ai";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { auth } from "@clerk/nextjs/server";
import type { Id } from "../../convex/_generated/dataModel";

// Initialize Convex client for server-side usage
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// 🛠️ UNIFIED TO-DO MANAGEMENT AND UI TOOLS

export const createTodo = tool({
  description:
    "Create a new to-do item for the user. Extract the task description directly from what the user wants to add to their todo list. After successfully creating, consider calling getTodos to show the user their updated list including the new item.",
  parameters: z.object({
    description: z
      .string()
      .describe(
        "The task description - what the user wants to do or be reminded of"
      ),
    project: z
      .string()
      .optional()
      .describe("Optional project name to categorize the to-do"),
    tags: z
      .array(z.string())
      .optional()
      .describe("Optional tags for categorization"),
    priority: z
      .enum(["low", "medium", "high"])
      .optional()
      .describe("Priority level of the to-do"),
    dueDate: z
      .string()
      .optional()
      .describe("Optional due date in ISO format (e.g., '2024-01-15')"),
  }),
  execute: async ({ description, project, tags, priority, dueDate }) => {
    try {
      // Extract user ID from the most recent user message context
      // This is a simplified approach - in production, you'd want more robust user identification
      // TODO: Add more robust user identification
      console.log("🛠️ [TOOL] createTodo called:", {
        description,
        project,
        tags,
        priority,
        dueDate,
      });

      // Since we're in a server action context, we need to get the authenticated user
      const { userId } = await auth();
      if (!userId) {
        throw new Error("User not authenticated");
      }

      // Parse due date if provided
      let dueDateTimestamp: number | undefined;
      if (dueDate) {
        const parsedDate = new Date(dueDate);
        if (isNaN(parsedDate.getTime())) {
          throw new Error("Invalid date format provided");
        }
        dueDateTimestamp = parsedDate.getTime();
      }

      const todoId = await convex.mutation(api.todos.createTodo, {
        userId,
        description,
        project,
        tags,
        priority,
        dueDate: dueDateTimestamp,
      });

      console.log("✅ [TOOL] Todo created successfully:", todoId);
      return {
        success: true,
        todoId,
        message: `Successfully created to-do: "${description}"${
          project ? ` in project "${project}"` : ""
        }${priority ? ` with ${priority} priority` : ""}`,
      };
    } catch (error) {
      console.error("❌ [TOOL] Failed to create todo:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create to-do",
      };
    }
  },
});

export const updateTodo = tool({
  description:
    "Update an existing to-do item's properties (description, project, tags, priority, or due date). CRITICAL: When a user wants to update a to-do item but doesn't provide the exact ID, you must first call getTodos to retrieve the current list, then semantically match the to-do item they're referring to, and use the exact 'id' field from that response. Never ask the user for the ID - find it yourself by matching their description to the existing to-do items. After successfully updating, call getTodos again to show the user the updated list so they can see the changes.",
  parameters: z.object({
    todoId: z
      .string()
      .describe(
        "The exact database ID from getTodos response (e.g., 'j97abc123xyz') - NOT a simple number. If you don't have this, call getTodos first to find the matching item."
      ),
    description: z.string().optional().describe("New task description"),
    project: z.string().optional().describe("New project name"),
    tags: z.array(z.string()).optional().describe("New tags array"),
    priority: z
      .enum(["low", "medium", "high"])
      .optional()
      .describe("New priority level"),
    dueDate: z
      .string()
      .optional()
      .describe(
        "New due date in ISO format (e.g., '2024-01-15') or null to remove"
      ),
  }),
  execute: async ({
    todoId,
    description,
    project,
    tags,
    priority,
    dueDate,
  }) => {
    try {
      console.log("🛠️ [TOOL] updateTodo called:", {
        todoId,
        description,
        project,
        tags,
        priority,
        dueDate,
      });

      const { userId } = await auth();
      if (!userId) {
        throw new Error("User not authenticated");
      }

      // Parse due date if provided
      let dueDateTimestamp: number | undefined;
      if (dueDate) {
        const parsedDate = new Date(dueDate);
        if (isNaN(parsedDate.getTime())) {
          throw new Error("Invalid date format provided");
        }
        dueDateTimestamp = parsedDate.getTime();
      }

      await convex.mutation(api.todos.updateTodo, {
        todoId: todoId as Id<"todos">,
        userId,
        description,
        project,
        tags,
        priority,
        dueDate: dueDateTimestamp,
      });

      console.log("✅ [TOOL] Todo updated successfully");
      return {
        success: true,
        message: `Successfully updated to-do item${
          description ? ` with new description: "${description}"` : ""
        }`,
      };
    } catch (error) {
      console.error("❌ [TOOL] Failed to update todo:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update to-do",
      };
    }
  },
});

export const getTodos = tool({
  description:
    "Get the user's to-do list, optionally filtered by completion status or project. CRITICAL: Always check this tool for the latest updates instead of relying on chat message history. When displaying results, use these formatting guidelines:\n\n**Default Display:** Always use the Simplified View unless the user specifically requests the Complete View.\n\n**For Simplified View:**\n- Use markdown list formatting (with dashes)\n- Format each item as: - [Status Emoji] Description\n- Status: ✅ (completed) or 🔴 (not completed)\n- Do NOT show IDs in simplified view\n- Example: - 🔴 Fix the login bug\n\n**For Complete View:**\n- Format description as h3 heading with status emoji: ### [Status Emoji] Description\n- Below the heading, display details in bullet list format:\n  - Project: [project name]\n  - Tags: [tag1, tag2, ...]\n  - Priority: [priority level]\n  - Due Date: [date with urgency emoji]\n  - ID: [todo ID]\n- Due Date Urgency: ⚠️ (overdue), 🔥 (due today), ⏰ (due soon), 📅 (future due date)\n- Group by project or priority when helpful\n\nAlways format lists in a clean, readable manner with proper line breaks between items. This tool also supports beautiful UI display - if the user wants to see todos in a table format, this tool will return UI-compatible data that gets rendered as a beautiful TodoListDisplay component.",
  parameters: z.object({
    completed: z
      .boolean()
      .optional()
      .describe(
        "Filter by completion status (true for completed, false for pending)"
      ),
    project: z.string().optional().describe("Filter by project name"),
  }),
  execute: async ({ completed, project }) => {
    try {
      console.log("🛠️ [TOOL] getTodos called:", { completed, project });

      const { userId } = await auth();
      if (!userId) {
        throw new Error("User not authenticated");
      }

      const todos = await convex.query(api.todos.getTodos, {
        userId,
        completed,
        project,
      });

      console.log("✅ [TOOL] Retrieved", todos.length, "todos");

      const formattedTodos = todos.map((todo) => ({
        id: todo._id,
        description: todo.description,
        completed: todo.completed,
        project: todo.project,
        tags: todo.tags,
        priority: todo.priority,
        dueDate: todo.dueDate
          ? new Date(todo.dueDate).toISOString().split("T")[0]
          : undefined,
        createdAt: new Date(todo._creationTime).toISOString().split("T")[0],
      }));

      return {
        success: true,
        todos: formattedTodos,
        count: todos.length,
        filterApplied: {
          completed: completed !== undefined ? completed : null,
          project: project || null,
        },
        message: `Found ${todos.length} to-do${todos.length !== 1 ? "s" : ""}${
          completed !== undefined
            ? completed
              ? " (completed)"
              : " (pending)"
            : ""
        }${project ? ` in project "${project}"` : ""}`,
      };
    } catch (error) {
      console.error("❌ [TOOL] Failed to get todos:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to retrieve to-dos",
      };
    }
  },
});

export const toggleTodo = tool({
  description:
    "Mark a to-do item as complete or incomplete. CRITICAL: You must first call getTodos to retrieve the current list and use the exact 'id' field from that response. Never guess or use simple numbers as todoId. After successfully toggling, call getTodos again to show the user the updated list so they can see the changes.",
  parameters: z.object({
    todoId: z
      .string()
      .describe(
        "The exact database ID from getTodos response (e.g., 'j97abc123xyz') - NOT a simple number"
      ),
    completed: z
      .boolean()
      .describe(
        "Set to true to mark as completed, false to mark as incomplete"
      ),
  }),
  execute: async ({ todoId, completed }) => {
    try {
      console.log("🛠️ [TOOL] toggleTodo called:", { todoId, completed });

      const { userId } = await auth();
      if (!userId) {
        throw new Error("User not authenticated");
      }

      await convex.mutation(api.todos.toggleTodo, {
        todoId: todoId as Id<"todos">,
        userId,
        completed,
      });

      console.log("✅ [TOOL] Todo toggled successfully");
      return {
        success: true,
        message: `Successfully marked to-do as ${
          completed ? "completed" : "incomplete"
        }`,
      };
    } catch (error) {
      console.error("❌ [TOOL] Failed to toggle todo:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update to-do",
      };
    }
  },
});

export const deleteTodo = tool({
  description:
    "Delete a to-do item permanently. CRITICAL: When a user wants to delete a to-do item but doesn't provide the exact ID, you must first call getTodos to retrieve the current list, then semantically match the to-do item they're referring to, and use the exact 'id' field from that response. Never ask the user for the ID - find it yourself by matching their description to the existing to-do items. After successfully deleting, call getTodos again to show the user the updated list so they can confirm the deletion.",
  parameters: z.object({
    todoId: z
      .string()
      .describe(
        "The exact database ID from getTodos response (e.g., 'j97abc123xyz') - NOT a simple number. If you don't have this, call getTodos first to find the matching item."
      ),
  }),
  execute: async ({ todoId }) => {
    try {
      console.log("🛠️ [TOOL] deleteTodo called:", { todoId });

      const { userId } = await auth();
      if (!userId) {
        throw new Error("User not authenticated");
      }

      await convex.mutation(api.todos.deleteTodo, {
        todoId: todoId as Id<"todos">,
        userId,
      });

      console.log("✅ [TOOL] Todo deleted successfully");
      return {
        success: true,
        message: "Successfully deleted the to-do item",
      };
    } catch (error) {
      console.error("❌ [TOOL] Failed to delete todo:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete to-do",
      };
    }
  },
});

export const getProjects = tool({
  description:
    "Get all project names that the user has assigned to their to-dos",
  parameters: z.object({}),
  execute: async () => {
    try {
      console.log("🛠️ [TOOL] getProjects called");

      const { userId } = await auth();
      if (!userId) {
        throw new Error("User not authenticated");
      }

      const projects = await convex.query(api.todos.getProjects, {
        userId,
      });

      console.log("✅ [TOOL] Retrieved", projects.length, "projects");
      return {
        success: true,
        projects,
        count: projects.length,
        message: `Found ${projects.length} project${
          projects.length !== 1 ? "s" : ""
        }`,
      };
    } catch (error) {
      console.error("❌ [TOOL] Failed to get projects:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to retrieve projects",
      };
    }
  },
});

export const getTags = tool({
  description: "Get all tags that the user has assigned to their to-dos",
  parameters: z.object({}),
  execute: async () => {
    try {
      console.log("🛠️ [TOOL] getTags called");

      const { userId } = await auth();
      if (!userId) {
        throw new Error("User not authenticated");
      }

      const tags = await convex.query(api.todos.getTags, {
        userId,
      });

      console.log("✅ [TOOL] Retrieved", tags.length, "tags");
      return {
        success: true,
        tags,
        count: tags.length,
        message: `Found ${tags.length} tag${tags.length !== 1 ? "s" : ""}`,
      };
    } catch (error) {
      console.error("❌ [TOOL] Failed to get tags:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to retrieve tags",
      };
    }
  },
});

// 🎨 SPECIALIZED UI DISPLAY TOOL (Alternative to getTodos for explicit UI requests)
export const displayTodosUI = tool({
  description:
    "Display the user's to-do list in a beautiful UI format with rows and columns, specifically for when users explicitly ask for a visual/table display. This is an alternative to getTodos that focuses purely on UI rendering. Use this when users specifically request visual display, otherwise use getTodos which can handle both text and UI display.",
  parameters: z.object({
    completed: z
      .boolean()
      .optional()
      .describe(
        "Filter by completion status (true for completed, false for pending)"
      ),
    project: z.string().optional().describe("Filter by project name"),
  }),
  execute: async ({ completed, project }) => {
    try {
      console.log("🎨 [UI TOOL] displayTodosUI called:", {
        completed,
        project,
      });

      const { userId } = await auth();
      if (!userId) {
        throw new Error("User not authenticated");
      }

      const todos = await convex.query(api.todos.getTodos, {
        userId,
        completed,
        project,
      });

      console.log(
        "✅ [UI TOOL] Retrieved",
        todos.length,
        "todos for UI display"
      );

      const formattedTodos = todos.map((todo) => ({
        id: todo._id,
        description: todo.description,
        completed: todo.completed,
        project: todo.project,
        tags: todo.tags,
        priority: todo.priority,
        dueDate: todo.dueDate
          ? new Date(todo.dueDate).toISOString().split("T")[0]
          : undefined,
        createdAt: new Date(todo._creationTime).toISOString().split("T")[0],
      }));

      return {
        success: true,
        todos: formattedTodos,
        count: todos.length,
        filterApplied: {
          completed: completed !== undefined ? completed : null,
          project: project || null,
        },
      };
    } catch (error) {
      console.error("❌ [UI TOOL] Failed to get todos for UI display:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to retrieve to-dos",
        todos: [],
        count: 0,
        filterApplied: {
          completed: null,
          project: null,
        },
      };
    }
  },
});

// Export all tools as a unified collection
export const tools = {
  createTodo,
  updateTodo,
  getTodos,
  toggleTodo,
  deleteTodo,
  getProjects,
  getTags,
  displayTodosUI,
};
