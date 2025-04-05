"use server";
import { getPageContext } from "vike-react-rsc/pageContext";

const todos: string[] = [];

export const getTodos = async () => {
  return todos;
};

export const addTodo = async (title: string) => {
  console.log("Adding todo:", title);

  const ctx = getPageContext();
  console.log("PageContext in action handler", ctx.pageId);

  // await new Promise((resolve) => setTimeout(resolve, 1000));
  todos.push(title);
};
