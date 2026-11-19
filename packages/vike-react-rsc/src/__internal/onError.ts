// Not in __internal/ssr, which imports React: Vike loads a global hook as the server starts, before Vite optimizes React, which would then load twice
export { onError } from "../ssr/onError";
