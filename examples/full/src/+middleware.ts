import { enhance } from "@universal-middleware/core";
import { increment } from "./serverCounts";

declare global {
  namespace Vike {
    interface PageContext {
      mwMethod?: string;
    }
  }
}

// Ordered after vike-react-rsc's server action middleware: the action still sees its context, because Vike runs the
// action in the page it renders after every middleware
export default enhance(
  (request: Request): { mwMethod: string } => {
    increment(`middleware ${new URL(request.url).pathname}`);
    return { mwMethod: request.method };
  },
  { name: "methodMiddleware", order: 1 }
);
