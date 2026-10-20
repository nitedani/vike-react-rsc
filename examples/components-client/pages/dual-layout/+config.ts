import type { Config } from "vike/types";

// A package whose export has an import file and a require file
export default {
  Layout: "import:react-server-layout/DualLayout:default",
} satisfies Config;
