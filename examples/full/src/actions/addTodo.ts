"use server";

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
}

const todos: Todo[] = [];

export const getTodos = async () => {
  // Sort todos by creation date (newest first)
  return [...todos].sort((a, b) => b.createdAt - a.createdAt);
};

export const addTodo = async (title: string) => {
  console.log("Adding todo:", title);

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  const newTodo: Todo = {
    id: Math.random().toString(36).substring(2, 9),
    title,
    completed: false,
    createdAt: Date.now()
  };

  todos.push(newTodo);
};

export const deleteTodo = async (id: string) => {
  console.log("Deleting todo:", id);

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  const index = todos.findIndex(todo => todo.id === id);
  if (index !== -1) {
    todos.splice(index, 1);
  }
};

export const toggleTodo = async (id: string) => {
  console.log("Toggling todo:", id);

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  const todo = todos.find(todo => todo.id === id);
  if (todo) {
    todo.completed = !todo.completed;
  }
};
