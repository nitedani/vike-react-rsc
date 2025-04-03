"use server";

const todos: string[] = [];

export const getTodos = async () => {
  return todos;
};

export const addTodo = async (title: string) => {
  console.log("Adding todo:", title);

  // await new Promise((resolve) => setTimeout(resolve, 1000));
  todos.push(title);
};
