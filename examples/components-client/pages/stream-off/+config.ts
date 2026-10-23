import type { Config } from "vike/types";

export default {
  // As an extension that needs a stream sets it: the HTML still renders to a stream
  stream: { require: true, enable: false },
} satisfies Config;
