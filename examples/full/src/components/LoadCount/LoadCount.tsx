"use server";

import { increment } from "../../serverCounts";

// Loaded with rsc(): the count tells a server render from a cache hit
export async function LoadCount() {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return <p data-load-count="">Rendered by the server {increment("LoadCount")} times</p>;
}
