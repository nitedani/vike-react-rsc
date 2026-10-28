import type { PageContextServer } from "vike/types";

// A pageContext value that streams to the browser: a tick every 100 ms for 3 s, on each render and rerender()
export function data(pageContext: PageContextServer) {
  (pageContext as { ticker?: AsyncIterable<number> }).ticker = ticks();
}

async function* ticks() {
  for (let tick = 1; tick <= 30; tick++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    yield tick;
  }
}
