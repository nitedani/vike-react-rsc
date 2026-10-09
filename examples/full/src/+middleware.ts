import { enhance, type UniversalMiddleware } from "@universal-middleware/core";

// Not a handler (no `path`, no `order`): it runs before vike-react-rsc's server action middleware, which passes the
// context on to the page it re-renders
declare global {
  namespace Vike {
    interface PageContext {
      mwMethod?: string;
    }
  }
}

const methodMiddleware: UniversalMiddleware = enhance(
  (request: Request) => ({ mwMethod: request.method }),
  { name: "example:method" }
);
export default methodMiddleware;
