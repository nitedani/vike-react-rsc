import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getPageContext } from "vike-react-rsc/pageContext";

// The film data is served by this example (public/api), so the demo needs no internet
export async function fetchApi<T>(path: string): Promise<T> {
  const host = getPageContext().headers?.host;
  // Pre-rendering has no request, and no server to ask
  if (!host) return JSON.parse(await readFile(join(process.cwd(), "public", path), "utf8"));
  return fetch(new URL(path, "http://" + host)).then((res) => res.json());
}
