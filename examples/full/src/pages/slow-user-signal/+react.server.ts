import type { Config } from "vike/types";

// A function, so that each request gets its own signal
export default (() => ({ renderToStreamOptions: { signal: AbortSignal.timeout(200) } })) satisfies Config["react"];
