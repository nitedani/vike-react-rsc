"use client";

import { useRef } from "react";
import { addTodo } from "../actions/addTodo";

export const Todos = ({ todos }: { todos: string[] }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const onAddTodo = async () => {
    if (inputRef.current) {
      await addTodo(inputRef.current.value);
      inputRef.current.value = "";
    }
  };

  return (
    <div>
      {todos.map((todo) => (
        <div key={todo}>{todo}</div>
      ))}
      <input type="text" ref={inputRef} />
      <button onClick={onAddTodo}>Add todo</button>
    </div>
  );
};
