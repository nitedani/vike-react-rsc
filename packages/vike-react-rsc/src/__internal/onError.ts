// Vike loads global hooks as the server starts: React imported there, before Vite optimizes it, would be a second copy
export { onError } from "../ssr/onError";
