import type { Config } from "vike/types";

// A package whose export has a react-server condition
export default {
  Layout: "import:react-server-layout/Layout:default",
} satisfies Config;
