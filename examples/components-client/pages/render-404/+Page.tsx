"use server component";
import { render } from "vike/abort";

export default async function Page() {
  await Promise.resolve();
  throw render(404);
}
