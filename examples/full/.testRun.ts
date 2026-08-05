export { testRun };
import {
  test,
  expect,
  run,
  fetchHtml,
  page,
  autoRetry,
  getServerUrl,
} from "@brillout/test-e2e";

const pages = {
  "/": {
    text: "Vike React Server Components",
  },
  "/todos": {
    text: "A powerful todo application built with Vike React Server Components",
  },
  "/suspense": {
    text: "Component-Level Suspense",
  },
  "/data": {
    text: "Page-Level Loading",
  },
} as const;

function testRun(cmd: `pnpm run ${"dev" | "preview"}`) {
  const isPreview = cmd === "pnpm run preview";

  run(cmd, {
    serverUrl: process.env.SERVER_URL,
    serverIsReadyMessage: (log) =>
      log.includes("Local:") || log.includes("ready in"),
    // `pnpm run preview` builds before it serves.
    additionalTimeout: isPreview ? 60000 : 0,
    // Emitted by react-dom while servicing @vitejs/plugin-rsc's preloadDeps().
    // The href is a Vite dep-optimizer artifact, so it is dev-only, and a
    // preload the browser rejects is simply not performed — hydration still
    // completes. Neither this example nor vike-react-rsc emits any preload,
    // and the server-rendered HTML contains none. Only proven for dev; the
    // preview lane must not silently inherit the tolerance.
    tolerateError: isPreview
      ? undefined
      : ({ logSource, logText }) =>
          logSource === "Browser Warning" &&
          logText.includes("<link rel=preload> must have a valid `as` value"),
  });

  testPages();
  testResponseTail();
  testPageNavigation();
  testCounter();
  testTodoForm();
  testFilmGrid();
}

// The RSC payload is streamed into the HTML as it renders, and the response is
// held open until the payload completes. If the response closes early, the tail
// Vike appends is truncated and the page cannot hydrate — a failure that leaves
// the visible markup intact, so only ordering catches it.
function testResponseTail() {
  test("Response tail is complete and ordered", async () => {
    const html = await fetchHtml("/");
    // Match the INVOCATIONS, not the bootstrap script that defines these functions —
    // the definitions sit in <head> and would satisfy the ordering trivially.
    const positions = [
      ["rsc chunk", html.indexOf("<script>self.__rsc_web_stream_push(")],
      ["rsc close marker", html.indexOf("<script>self.__rsc_web_stream_close()")],
      ["pageContext", html.indexOf('id="vike_pageContext"')],
      ["client entry", html.search(/<script[^>]*type="module"/)],
    ] as const;

    for (const [name, at] of positions) {
      expect(at, `${name} missing from response`).to.not.equal(-1);
    }
    for (let i = 1; i < positions.length; i++) {
      const [name, at] = positions[i]!;
      const [prevName, prevAt] = positions[i - 1]!;
      expect(
        at > prevAt,
        `${name} must come after ${prevName}`
      ).to.equal(true);
    }
  });
}

function testPages() {
  Object.entries(pages).forEach(([url, pageInfo]) => {
    testPage({ url, ...pageInfo });
  });
}

function testPage({ url, text }: { url: string; text: string }) {
  test(url + " (HTML)", async () => {
    const html = await fetchHtml(url);
    expect(html).to.include(text);
  });

  test(url + " (Hydration)", async () => {
    await page.goto(getServerUrl() + url);
    const body = await page.textContent("body");
    expect(body).to.include(text);
  });
}

function testPageNavigation() {
  test("Navigation between pages", async () => {
    await page.goto(getServerUrl() + "/");
    await autoRetry(async () => {
      expect(await page.textContent("h1")).to.include(
        "Vike React Server Components"
      );
    });

    await page.click('a[href="/todos"]');
    await autoRetry(async () => {
      expect(await page.textContent("h1")).to.include("Task Manager");
    });

    await page.click('a[href="/suspense"]');
    await autoRetry(async () => {
      expect(await page.textContent("h1")).to.include(
        "Component-Level Suspense"
      );
    });

    await page.click('a[href="/data"]');
    await autoRetry(async () => {
      expect(await page.textContent("h1")).to.include("Page-Level Loading");
    });

    await page.click('a[href="/"]');
    await autoRetry(async () => {
      expect(await page.textContent("h1")).to.include(
        "Vike React Server Components"
      );
    });
  });
}

function testCounter() {
  test("Counter functionality", async () => {
    await page.goto(getServerUrl() + "/");

    // The client component's display container; its only child holds the count.
    const readCount = async () =>
      Number(await page.textContent("[data-shared-util-client] div"));

    await autoRetry(
      async () => {
        expect(await page.textContent("body")).to.include("Increment");
      },
      { timeout: 5000 }
    );

    // The value, not the label: a server action that runs but never updates the
    // client leaves the button in place and the number unchanged. The click is
    // retried because one landing before hydration is a no-op, and the count is
    // server-side global state, so assert it grew rather than pinning an absolute.
    const before = await readCount();
    await autoRetry(
      async () => {
        await page.click('button:has-text("Increment")');
        expect(await readCount()).to.be.greaterThan(before);
      },
      { timeout: 15000 }
    );
  });
}

function testTodoForm() {
  test("Todo form functionality", async () => {
    await page.goto(getServerUrl() + "/todos");

    await autoRetry(
      async () => {
        const input = await page.$(
          'input[placeholder="What needs to be done?"]'
        );
        expect(input).to.not.equal(null);

        await input?.fill("Test Todo Item");

        const addButton = await page.$('button:has-text("Add Task")');
        expect(addButton).to.not.equal(null);
        await addButton?.click();

        await autoRetry(
          async () => {
            const todoText = await page.textContent("body");
            expect(todoText).to.include("Test Todo Item");
          },
          { timeout: 3000 }
        );
      },
      { timeout: 10000 }
    );
  });
}

function testFilmGrid() {
  test("Film grid loading and display", async () => {
    await page.goto(getServerUrl() + "/suspense");

    await autoRetry(
      async () => {
        const pageText = await page.textContent("body");
        expect(pageText).to.include("Component-Level");
      },
      { timeout: 15000 }
    );
  });
}
