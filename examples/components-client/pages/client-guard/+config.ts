import type { Config } from "vike/types";

export default {
  // testPageContextRequests(): a guard() that meta keeps in the browser asks the server for nothing
  meta: { guard: { env: { client: true } } },
} satisfies Config;
