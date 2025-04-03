"use server";

const todos: string[] = [];

export const getTodos = async () => {
  return todos;
};

export const addTodo = async (title: string) => {
  console.log("Adding todo:", title);

  todos.push(title);
};
