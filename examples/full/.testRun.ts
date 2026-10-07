export { testRun };
import {
  test,
  expect,
  run,
  fetchHtml,
  page,
  autoRetry,
  skip,
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
  "/client": {
    text: "Client Component",
  },
} as const;

const REACT_RSC_STYLESHEET_PRELOAD_WARNING =
  "<link rel=preload> must have a valid `as` value";

// React requires eval() in development and says so under a CSP without
// 'unsafe-eval'; it never uses eval() in production.
const REACT_DEV_EVAL_CSP_ERROR =
  "eval() is not supported in this environment.";

// React's dev performance track throws on aborted components until
// https://github.com/react/react/pull/37572 is released.
const REACT_DEV_PERF_TRACK_ERROR = "cannot have a negative time stamp";

function testRun(cmd: `pnpm run ${"dev" | "preview" | "preview:static"}`) {
  const isDev = cmd === "pnpm run dev";
  // Pre-rendered, and served like a static host would
  const isStatic = cmd === "pnpm run preview:static";

  run(cmd, {
    serverUrl: process.env.SERVER_URL,
    serverIsReadyMessage: (log) =>
      log.includes("Local:") || log.includes("ready in"),
    // The preview commands build before they serve.
    additionalTimeout: isDev ? 0 : 60000,
    // React 19.2.8 mislabels plugin-rsc stylesheet hints (fixed by #34760,
    // d446597). Remove this tolerance with the first release containing the fix.
    tolerateError: ({ logSource, logText }) =>
      (logSource === "Browser Warning" &&
        logText === REACT_RSC_STYLESHEET_PRELOAD_WARNING) ||
      // Vite also forwards the browser's error to the server's stderr.
      (isDev && logText.includes(REACT_DEV_EVAL_CSP_ERROR)) ||
      (isDev && logText.includes(REACT_DEV_PERF_TRACK_ERROR)) ||
      // testCrossSiteAction()
      (logSource === "stderr" && logText.includes("HTTP response ← /todos 403")) ||
      // Pre-rendering runs inside a build hook, which Rolldown reports as slow.
      (isStatic &&
        logSource === "stderr" &&
        logText.includes("[PLUGIN_TIMINGS]")),
  });

  testPages();
  testCssProp();
  testEnvironments();
  testBinaryPayload();
  testScriptBreakout();
  testCspNonce();
  testResponseTail();
  // A static host has no server to run server actions.
  if (!isStatic) {
    testCounter();
    testTodoForm();
    testSession();
    testCrossSiteAction();
    testRscComponentCall();
  }
  testFilmGrid();
  testNavigationRequests();
  testPageNavigation();
}

// The RSC payload and Vike's progressive-hydration bootstrap are independent
// producers sharing react-streaming's ordered sink. Their relative order is
// intentionally unspecified: the client can start consuming the still-open RSC
// stream. What must remain ordered is each producer's own protocol, and the RSC
// close marker must be written before the enclosing HTML stream ends.
function testResponseTail() {
  test("Response tail is complete and ordered", async () => {
    const html = await fetchHtml("/");
    const positions = {
      rscClose: html.indexOf('\\"end\\":true'),
      pageContext: html.indexOf('id="vike_pageContext"'),
      clientEntry: html.search(/<script[^>]*type="module"/),
      bodyClose: html.lastIndexOf("</body>"),
    };

    for (const [name, at] of Object.entries(positions)) {
      expect(at, `${name} missing from response`).to.not.equal(-1);
    }
    expect(
      positions.bodyClose > positions.rscClose,
      "HTML stream must remain open through the RSC close marker"
    ).to.equal(true);
    expect(
      positions.clientEntry > positions.pageContext,
      "client entry must come after pageContext"
    ).to.equal(true);
  });
}

// TODO: unskip with the first release of vite-plugin-compiled-react containing
// nitedani/vite-plugin-compiled-react#3 (Vite 8 / @vitejs/plugin-react 6 support).
// Until then the `css` prop reaches the HTML untransformed.
function testCssProp() {
  test("css prop is transformed", async () => {
    skip("vite-plugin-compiled-react does not support Vite 8 yet");
    return;
    const html = await fetchHtml("/");
    expect(html).to.not.include('css="[object Object]"');
  });
}

function testPages() {
  Object.entries(pages).forEach(([url, pageInfo]) => {
    testPage({ url, ...pageInfo });
  });
}

function testEnvironments() {
  test("/environments: ssr reads the rsc config values", async () => {
    const html = await fetchHtml("/environments");
    expect(html).to.include('id="greeting-rsc">Hello from the rsc environment<');
    expect(html).to.include('id="greeting-ssr">Hello from the rsc environment<');
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

    await waitForHydration();
    const initialTimeOrigin = await page.evaluate(() => performance.timeOrigin);

    await page.click('a[href="/todos"]');
    await autoRetry(async () => {
      expect(await page.textContent("h1")).to.include("Task Manager");
    });
    expect(await page.evaluate(() => performance.timeOrigin)).to.equal(
      initialTimeOrigin
    );

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

// A user navigates after the page is interactive, not merely after its
// server-rendered DOM exists. Wait until React has attached the button's
// event props so a test measures normal client-side navigation rather than a
// synthetic pre-hydration click.
async function waitForHydration(buttonText = "Increment") {
  await autoRetry(
    async () => {
      const isHydrated = await page.evaluate((buttonText) => {
        const button = Array.from(document.querySelectorAll("button")).find(
          (candidate) => candidate.textContent?.includes(buttonText)
        );
        return (
          button !== undefined &&
          Object.keys(button).some((key) => key.startsWith("__reactProps$"))
        );
      }, buttonText);
      expect(isHydrated).to.equal(true);
    },
    { timeout: 5000 }
  );
}

function testNavigationRequests() {
  test("Navigation and back navigation: one request each", async () => {
    await page.goto(getServerUrl() + "/");
    await waitForHydration();

    const requests: string[] = [];
    page.on("request", (request) => {
      if (["document", "fetch", "xhr"].includes(request.resourceType())) {
        requests.push(new URL(request.url()).pathname);
      }
    });

    await page.click('a[href="/todos"]');
    await autoRetry(async () => {
      expect(await page.textContent("h1")).to.include("Task Manager");
    });
    expect(requests).to.have.length(1);
    expect(requests[0]).to.match(/\.pageContext\.json$/);

    await page.goBack();
    await autoRetry(async () => {
      expect(await page.textContent("h1")).to.include(
        "Vike React Server Components"
      );
    });
    expect(requests).to.have.length(2);
    expect(requests[1]).to.match(/\.pageContext\.json$/);
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
    await waitForHydration("Add Task");
    const readTodoCount = async () =>
      Number((await page.textContent("#todo-count"))?.match(/\d+/)?.[0]);
    const countBefore = await readTodoCount();
    const requests: string[] = [];
    const onRequest = (request: { method(): string; url(): string; resourceType(): string }) => {
      if (["document", "fetch", "xhr"].includes(request.resourceType())) {
        requests.push(request.method() + " " + new URL(request.url()).pathname);
      }
    };
    page.on("request", onRequest);

    await page.fill('input[placeholder="What needs to be done?"]', "Test Todo Item");
    await page.click('button:has-text("Add Task")');
    await autoRetry(async () => {
      expect(await page.textContent("body")).to.include("Test Todo Item");
    });
    // One request: the action, then +data and the page, which see the new task
    expect(await readTodoCount()).to.equal(countBefore + 1);
    expect(requests).to.deep.equal(["POST /todos"]);
    page.off("request", onRequest);
  });
}

function testSession() {
  test("Server action: cookie, guard() and throw redirect()", async () => {
    // The guard shows the login page at /account
    await page.goto(getServerUrl() + "/account");
    await waitForHydration("Log in");
    expect(await page.textContent("h1")).to.equal("Log in");

    // The action sets the cookie, then the guard of the same request sees it
    await page.click('button:has-text("Log in")');
    await autoRetry(async () => {
      expect(await page.textContent("#account-user")).to.equal("Logged in as alice");
    });
    const session = async () =>
      (await page.context().cookies()).find((c) => c.name === "session")?.value;
    expect(await session()).to.equal("alice");

    // The action clears the cookie, then throws redirect("/")
    await page.click('button:has-text("Log out")');
    await autoRetry(async () => {
      expect(new URL(page.url()).pathname).to.equal("/");
      expect(await page.textContent("h1")).to.include("Vike React Server Components");
    });
    expect(await session()).to.equal(undefined);
  });

  test("Server action: guard() of the same request throws redirect()", async () => {
    // After the login, the guard of /login redirects to /account
    await page.goto(getServerUrl() + "/login");
    await waitForHydration("Log in");
    await page.click('button:has-text("Log in")');
    await autoRetry(async () => {
      expect(new URL(page.url()).pathname).to.equal("/account");
      expect(await page.textContent("#account-user")).to.equal("Logged in as alice");
    });
    await page.context().clearCookies();
  });
}

function testRscComponentCall() {
  test("rsc(): a server component loaded on click", async () => {
    await page.goto(getServerUrl() + "/suspense");
    await waitForHydration("View Details");
    await page.click('button:has-text("View Details")');
    await autoRetry(
      async () => {
        expect(await page.textContent("body")).to.include("Release Date");
      },
      { timeout: 15000 }
    );
  });
}

function testCrossSiteAction() {
  test("Server action: cross-site POST is rejected", async () => {
    const post = (headers: Record<string, string>) =>
      fetch(getServerUrl() + "/todos", {
        method: "POST",
        headers: { "x-rsc-action": "any", ...headers },
      });
    expect((await post({ "sec-fetch-site": "cross-site" })).status).to.equal(403);
    expect((await post({ origin: "https://example.com" })).status).to.equal(403);
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

function testBinaryPayload() {
  test("Typed array props survive the inline RSC payload", async () => {
    await page.goto(getServerUrl() + "/bytes");
    // The server-rendered HTML already shows the bytes; hydration is what reads
    // them back from the payload inlined in the HTML.
    await autoRetry(
      async () => {
        expect(await page.textContent("[data-bytes]")).to.equal(
          "Hydrated bytes: 0,128,255"
        );
      },
      { timeout: 5000 }
    );
  });
}

function testScriptBreakout() {
  test("Server strings can't break out of the inline RSC payload", async () => {
    await page.goto(getServerUrl() + "/xss");
    await autoRetry(
      async () => {
        expect(await page.textContent("[data-text]")).to.equal(
          "Hydrated: </script><script>window.__xss=1</script>"
        );
      },
      { timeout: 5000 }
    );
    expect(await page.evaluate(() => "__xss" in window)).to.equal(false);
  });
}

function testCspNonce() {
  test("Every inline script carries the CSP nonce", async () => {
    const html = await fetchHtml("/csp");
    const nonce = /<script[^>]* nonce="([^"]+)"/.exec(html)?.[1];
    expect(nonce, "nonce missing from response").to.be.a("string");
    const inlineScripts = html.match(/<script(?![^>]*\ssrc=)[^>]*>/g) ?? [];
    expect(inlineScripts.length).to.be.greaterThan(1);
    for (const script of inlineScripts) {
      expect(script).to.include(` nonce="${nonce}"`);
    }

    // The browser enforces Vike's Content-Security-Policy header: a script
    // without the nonce doesn't run, and the page doesn't hydrate.
    await page.goto(getServerUrl() + "/csp");
    await autoRetry(
      async () => {
        expect(await page.textContent("[data-csp]")).to.equal("Hydrated");
        expect(await page.textContent("[data-delayed]")).to.equal("Streamed");
      },
      { timeout: 5000 }
    );
  });
}
