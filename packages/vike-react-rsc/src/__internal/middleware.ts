// Vike loads +middleware at startup, before Vite optimizes React, so this module must not import React
export { actionMiddleware } from "../ssr/action";
