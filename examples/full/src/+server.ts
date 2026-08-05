import { apply } from "@universal-middleware/hono";
import { Hono } from "hono";
import vike from "vike/fetch";

const app = new Hono();

// vike/fetch is a universal-middleware handler taking (request, context, runtime),
// not a bare fetch — apply() is what supplies the latter two. Routes registered
// before this call take precedence over Vike's.
apply(app, [vike.fetch]);

export default {
  fetch: app.fetch,
};
