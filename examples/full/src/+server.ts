import { Hono } from "hono";
import vike from "vike/fetch";

const app = new Hono();

// Vike handles every route it owns; anything added above this line wins.
app.all("*", (c) => vike.fetch(c.req.raw));

export default {
  fetch: app.fetch,
};
