"use server component";
import { readFileSync } from "node:fs";

// It reads the server's files, so the browser gets only its stub
export const Loading = {
  layout: () => <p>Loading {JSON.parse(readFileSync("package.json", "utf8")).name}, read on the server</p>,
};
