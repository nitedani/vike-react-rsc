"use client";

import { useTransition } from "react";
import { deleteTodo, toggleTodo } from "../../actions/addTodo";
import { todoStyles } from "./styles";

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
}

export default function TodoItemClient({ todo }: { todo: Todo }) {
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isToggling, startToggleTransition] = useTransition();

  const handleDelete = () => {
    startDeleteTransition(async () => {
      await deleteTodo(todo.id);
    });
  };

  const handleToggle = () => {
    startToggleTransition(async () => {
      await toggleTodo(todo.id);
    });
  };

  // Format the date
  const formattedDate = new Date(todo.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <li
      css={todoStyles.todoItem}
    >
      <button
        onClick={handleToggle}
        disabled={isToggling}
        css={[
          todoStyles.todoCheckbox,
          todo.completed && todoStyles.todoCheckboxCompleted
        ]}
      >
        {todo.completed && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>

      <p css={[
        todoStyles.todoTitle,
        todo.completed && todoStyles.todoTitleCompleted
      ]}>
        {todo.title}
      </p>

      <span css={todoStyles.todoDate}>
        {formattedDate}
      </span>

      <button
        onClick={handleDelete}
        disabled={isDeleting}
        css={todoStyles.todoDeleteButton}
      >
        {isDeleting ? (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ animation: "spin 1s linear infinite" }}
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeDasharray="32"
              strokeDashoffset="8"
            />
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        )}
      </button>
    </li>
  );
}
