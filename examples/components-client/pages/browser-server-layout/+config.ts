import type { Config } from "vike/types";

// A package whose "use server component" export has a browser file, and a default file that imports server-only
export default {
  Layout: "import:react-server-layout/BrowserServerLayout:default",
} satisfies Config;
