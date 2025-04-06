"use client";

import { useRef, useTransition } from "react";
import { addTodo } from "../actions/addTodo";

export default function TodoFormClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isAdding, startTransition] = useTransition();

  const onAddTodo = async () => {
    startTransition(async () => {
      if (inputRef.current && inputRef.current.value.trim()) {
        await addTodo(inputRef.current.value);
        inputRef.current.value = "";
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onAddTodo();
    }
  };

  return (
    <div
      css={{
        marginBottom: "2rem",
        display: "flex",
        gap: "0.75rem",
        alignItems: "center",
        position: "relative",
        "@media (max-width: 768px)": {
          flexDirection: "column",
          gap: "1rem",
        },
      }}
    >
      <input
        type="text"
        ref={inputRef}
        placeholder="What needs to be done?"
        onKeyDown={handleKeyDown}
        css={{
          flex: 1,
          padding: "1rem 1.25rem",
          borderRadius: "50px",
          border: "1px solid #ddd",
          fontSize: "1rem",
          width: "100%",
          transition: "all 0.3s ease",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
          ":focus": {
            outline: "none",
            borderColor: "#0070f3",
            boxShadow: "0 0 0 3px rgba(0, 112, 243, 0.2)",
          },
        }}
      />
      <button
        onClick={onAddTodo}
        disabled={isAdding}
        css={{
          backgroundColor: "#0070f3",
          color: "white",
          border: "none",
          borderRadius: "50px",
          padding: "1rem 1.5rem",
          fontSize: "1rem",
          fontWeight: "600",
          cursor: "pointer",
          whiteSpace: "nowrap",
          transition: "all 0.3s ease",
          boxShadow: "0 4px 14px rgba(0, 118, 255, 0.39)",
          minWidth: "120px",
          "@media (max-width: 768px)": {
            width: "100%",
          },
          ":hover": {
            backgroundColor: "#005cc5",
            transform: "translateY(-2px)",
            boxShadow: "0 6px 20px rgba(0, 118, 255, 0.23)",
          },
          ":disabled": {
            backgroundColor: "#ccc",
            transform: "none",
            boxShadow: "none",
            cursor: "not-allowed",
          },
        }}
      >
        {isAdding ? (
          <span
            css={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            <svg
              style={{
                width: "16px",
                height: "16px",
                animation: "spin 1s linear infinite",
              }}
              viewBox="0 0 24 24"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray="32"
                strokeDashoffset="8"
              />
            </svg>
            Adding...
          </span>
        ) : (
          "Add Task"
        )}
      </button>
    </div>
  );
}
