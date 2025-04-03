"use client";

import { addTodo } from "../actions/addTodo";

export const Todos = ({ todos }: { todos: string[] }) => {
  return (
    <div>
      {todos.map((todo) => (
        <div key={todo}>{todo}</div>
      ))}
      <button onClick={() => addTodo("New todo")}>Add todo</button>
    </div>
  );
};
