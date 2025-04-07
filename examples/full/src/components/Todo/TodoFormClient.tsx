"use client";

import { useRef, useTransition } from "react";
import { addTodo } from "../../actions/addTodo";
import { todoStyles } from "./styles";

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
    <div css={todoStyles.form}>
      <input
        type="text"
        ref={inputRef}
        placeholder="What needs to be done?"
        onKeyDown={handleKeyDown}
        css={todoStyles.input}
      />
      <button
        onClick={onAddTodo}
        disabled={isAdding}
        css={todoStyles.addButton}
      >
        {isAdding ? (
          <span css={todoStyles.loadingButtonContent}>
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
