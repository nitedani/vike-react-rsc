"use server";

export async function sayHello() {
  return "Hello from a server action";
}

export async function Details() {
  return <p id="details">Details from the server</p>;
}
