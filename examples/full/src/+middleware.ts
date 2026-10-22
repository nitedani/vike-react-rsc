import { enhance, MiddlewareOrder } from "@universal-middleware/core";
import { increment } from "./serverCounts";

declare global {
  namespace Vike {
    interface PageContext {
      mwMethod?: string;
    }
  }
}

// As an auth middleware that finds the session expired: a POST goes to the login page, before any action runs
const sessionMiddleware = enhance(
  (request: Request): Response | undefined => {
    if (request.method === "POST" && /(?:^|;\s*)expired=/.test(request.headers.get("cookie") ?? "")) {
      return Response.redirect(new URL("/login", request.url).href, 302);
    }
  },
  { name: "sessionMiddleware", order: MiddlewareOrder.AUTHENTICATION }
);

// Ordered after vike-react-rsc's server action middleware: the action still sees its context, because Vike runs the
// action in the page it renders after every middleware
const methodMiddleware = enhance(
  (request: Request): { mwMethod: string } => {
    increment(`middleware ${new URL(request.url).pathname}`);
    return { mwMethod: request.method };
  },
  { name: "methodMiddleware", order: 1 }
);

export default [sessionMiddleware, methodMiddleware];
