import { Hono } from "hono";
import { apply } from "vike-server/hono";
import { serve } from "vike-server/hono/serve";

const app = new Hono();

apply(app);

serve(app, { port: 3000 });
