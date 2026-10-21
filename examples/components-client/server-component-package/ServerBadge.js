"use server component";
import { createElement } from "react";

export default async function ServerBadge({ label }) {
  const where = await Promise.resolve(typeof window === "undefined" ? "server" : "browser");
  return createElement("b", { id: "package-badge" }, `${label}, rendered on the ${where}`);
}
