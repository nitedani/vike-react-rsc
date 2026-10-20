import type { Config } from "vike/types";

// A package whose "use server component" export has a react-server condition
export default {
  Layout: "import:react-server-layout/ServerLayout:default",
} satisfies Config;
