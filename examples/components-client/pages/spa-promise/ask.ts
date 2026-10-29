"use server";

let answer: (text: string) => void;

// Pending until the browser asks, so the page's Flight ends only then
export async function waitForAnswer() {
  return new Promise<string>((resolve) => (answer = resolve));
}

export async function ask() {
  answer("Answered once asked");
}
