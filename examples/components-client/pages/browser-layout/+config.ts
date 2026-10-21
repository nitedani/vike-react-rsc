import type { Config } from "vike/types";

// A package whose export has a browser file that reads window as it loads
export default {
  Layout: "import:react-server-layout/BrowserLayout:default",
} satisfies Config;
