import { tool } from "ai";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { auth } from "@clerk/nextjs/server";

// Initialize Convex client for server-side usage
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const displayTodosUI = tool({
  description:
    "Display the user's to-do list in a beautiful UI format with rows and columns, optionally filtered by completion status or project",
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
      };
    }
  },
});

export const tools = {
  displayTodosUI,
};
