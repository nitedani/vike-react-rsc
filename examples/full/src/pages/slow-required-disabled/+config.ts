import type { Config } from "vike/types";

export default {
  // As an extension that requires streaming sets it, then the page's stream: false: react-streaming renders it whole
  stream: { require: true, enable: false },
} satisfies Config;
