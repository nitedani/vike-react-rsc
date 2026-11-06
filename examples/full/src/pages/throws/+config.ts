import type { Config } from "vike/types";

// Its server component throws inside Loading.layout's <Suspense>: pre-rendered, a static host has no error page to show
export default {
  prerender: false,
} satisfies Config;
