import { Hono } from "hono";
import { apply } from "vike-server/hono";
import { serve } from "vike-server/hono/serve";

const app = new Hono();
apply(app);
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
serve(app, { port });

console.log(123);

