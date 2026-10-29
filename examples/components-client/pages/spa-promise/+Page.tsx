"use server component";
import { Answer } from "./Answer";
import { waitForAnswer } from "./ask";

export default function Page() {
  return <Answer answer={waitForAnswer()} />;
}
