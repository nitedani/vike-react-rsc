"use server component";
import { Answer } from "./Answer";

export default function Page() {
  const answer = new Promise<string>((resolve) => setTimeout(() => resolve("Answered after a delay"), 1000));
  return <Answer answer={answer} />;
}
