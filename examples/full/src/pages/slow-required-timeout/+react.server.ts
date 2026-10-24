import type { Config } from "vike/types";
import { increment } from "../../serverCounts";

export default {
  renderToStreamOptions: { timeout: 0.2, onTimeout: () => increment("slow-required-timeout") },
} satisfies Config["react"];
