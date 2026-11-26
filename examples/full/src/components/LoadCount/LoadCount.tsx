"use server";

import { increment } from "../../serverCounts";

// Loaded with rsc(): the count tells a server render from a cache hit
export async function LoadCount() {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return <p data-load-count="">Rendered by the server {increment("LoadCount")} times</p>;
}

// Loaded with rsc() for a name: the count tells which load of that name it shows
export async function NamedLoadCount({ name }: { name: string }) {
  return <p data-named-load-count="">{name}, rendered by the server {increment(`NamedLoadCount:${name}`)} times</p>;
}
