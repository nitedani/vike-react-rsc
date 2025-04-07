"use client";

import { useTransition } from "react";
import { deleteTodo, toggleTodo } from "../actions/addTodo";

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

  return (
    <li
      css={{
        padding: "1rem 1.25rem",
        borderRadius: "12px",
        backgroundColor: "white",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
        border: "1px solid #eaeaea",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        transition: "all 0.3s ease",
        opacity: isDeleting ? 0.5 : 1,
        height: "60px", // Fixed height for consistency
        ":hover": {
          transform: "translateY(-3px)",
          boxShadow: "0 8px 15px rgba(0, 0, 0, 0.08)",
        },
      }}
    >
      <div
        css={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          flex: 1,
          overflow: "hidden",
        }}
      >
        <button
          onClick={handleToggle}
          disabled={isToggling}
          css={{
            width: "22px",
            height: "22px",
            borderRadius: "50%",
            border: todo.completed ? "none" : "2px solid #ddd",
            backgroundColor: todo.completed ? "#0070f3" : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s ease",
            padding: 0,
            ":hover": {
              borderColor: "#0070f3",
              backgroundColor: todo.completed
                ? "#005cc5"
                : "rgba(0, 112, 243, 0.1)",
            },
          }}
        >
          {isToggling ? (
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                border: "2px solid white",
                borderTopColor: "transparent",
                animation: "spin 0.7s linear infinite",
              }}
            />
          ) : todo.completed ? (
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
          ) : null}
        </button>

        <span
          css={{
            fontSize: "1rem",
            color: todo.completed ? "#999" : "#333",
            textDecoration: todo.completed ? "line-through" : "none",
            transition: "all 0.2s ease",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "100%",
          }}
        >
          {todo.title}
        </span>
      </div>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        css={{
          backgroundColor: "transparent",
          border: "none",
          color: "#ff4757",
          cursor: "pointer",
          padding: "0.5rem",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s ease",
          ":hover": {
            backgroundColor: "rgba(255, 71, 87, 0.1)",
          },
          ":disabled": {
            color: "#ffb8c0",
            cursor: "not-allowed",
          },
        }}
      >
        {isDeleting ? (
          <svg
            style={{
              width: "16px",
              height: "16px",
              animation: "spin 0.7s linear infinite",
            }}
            viewBox="0 0 24 24"
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
            width="18"
            height="18"
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
