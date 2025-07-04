import React from "react";
import {
  CalendarDays,
  Clock,
  Tag,
  FolderOpen,
  CheckCircle2,
  Circle,
  AlertCircle,
} from "lucide-react";

interface Todo {
  id: string;
  description: string;
  completed: boolean;
  project?: string;
  tags?: string[];
  priority?: "low" | "medium" | "high";
  dueDate?: string;
  createdAt: string;
}

interface TodoListDisplayProps {
  todos: Todo[];
  count: number;
  filterApplied: {
    completed: boolean | null;
    project: string | null;
  };
  success: boolean;
  error?: string;
}

const getPriorityColor = (priority?: string) => {
  switch (priority) {
    case "high":
      return "text-red-600 bg-red-50 border-red-200";
    case "medium":
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case "low":
      return "text-green-600 bg-green-50 border-green-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
};

const getPriorityIcon = (priority?: string) => {
  switch (priority) {
    case "high":
      return <AlertCircle className="w-3 h-3" />;
    case "medium":
      return <Clock className="w-3 h-3" />;
    case "low":
      return <CheckCircle2 className="w-3 h-3" />;
    default:
      return null;
  }
};

const getDueDateStatus = (dueDate?: string) => {
  if (!dueDate) return null;

  const due = new Date(dueDate);
  const today = new Date();
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0)
    return { status: "overdue", text: "Overdue", color: "text-red-600" };
  if (diffDays === 0)
    return { status: "today", text: "Due Today", color: "text-orange-600" };
  if (diffDays === 1)
    return {
      status: "tomorrow",
      text: "Due Tomorrow",
      color: "text-yellow-600",
    };
  if (diffDays <= 7)
    return {
      status: "week",
      text: `Due in ${diffDays} days`,
      color: "text-blue-600",
    };
  return {
    status: "future",
    text: `Due in ${diffDays} days`,
    color: "text-gray-600",
  };
};

export const TodoListDisplay: React.FC<TodoListDisplayProps> = ({
  todos,
  count,
  filterApplied,
  success,
  error,
}) => {
  if (!success) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <h3 className="font-medium text-red-800">Error Loading Todos</h3>
        </div>
        <p className="text-red-700 mt-2">{error}</p>
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 my-4 text-center">
        <div className="flex flex-col items-center gap-3">
          <CheckCircle2 className="w-12 h-12 text-gray-400" />
          <h3 className="font-medium text-gray-800">No Todos Found</h3>
          <p className="text-gray-600">
            {filterApplied.completed !== null || filterApplied.project
              ? "No todos match your current filters."
              : "You have no todos yet. Create your first todo to get started!"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm my-4 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">
              Your Todo List
            </h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {count} item{count !== 1 ? "s" : ""}
            </span>
          </div>
          {(filterApplied.completed !== null || filterApplied.project) && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Filtered:</span>
              {filterApplied.completed !== null && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                  {filterApplied.completed ? "Completed" : "Pending"}
                </span>
              )}
              {filterApplied.project && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                  {filterApplied.project}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Task
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tags
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {todos.map((todo) => {
              const dueDateStatus = getDueDateStatus(todo.dueDate);

              return (
                <tr
                  key={todo.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {todo.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400" />
                      )}
                      <span
                        className={`ml-2 text-sm font-medium ${
                          todo.completed ? "text-green-600" : "text-gray-900"
                        }`}
                      >
                        {todo.completed ? "Done" : "Pending"}
                      </span>
                    </div>
                  </td>

                  {/* Task */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 font-medium">
                      <span
                        className={
                          todo.completed ? "line-through text-gray-500" : ""
                        }
                      >
                        {todo.description}
                      </span>
                    </div>
                  </td>

                  {/* Project */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {todo.project ? (
                      <div className="flex items-center text-sm text-gray-900">
                        <FolderOpen className="w-4 h-4 text-gray-400 mr-1" />
                        {todo.project}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>

                  {/* Priority */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {todo.priority ? (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(
                          todo.priority
                        )}`}
                      >
                        {getPriorityIcon(todo.priority)}
                        <span className="ml-1 capitalize">{todo.priority}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>

                  {/* Due Date */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {todo.dueDate ? (
                      <div className="flex items-center text-sm">
                        <CalendarDays className="w-4 h-4 text-gray-400 mr-1" />
                        <div className="flex flex-col">
                          <span className="text-gray-900">{todo.dueDate}</span>
                          {dueDateStatus && (
                            <span className={`text-xs ${dueDateStatus.color}`}>
                              {dueDateStatus.text}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>

                  {/* Tags */}
                  <td className="px-6 py-4">
                    {todo.tags && todo.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {todo.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {count} todo{count !== 1 ? "s" : ""}
          </span>
          <span>Created: {new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
};
