export { testRun };
import {
  test,
  expect,
  run,
  fetchHtml,
  page,
  autoRetry,
  getServerUrl,
  sleep,
  editFile,
  editFileRevert,
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

// Thrown by /actions' data() after saveThenFailData()
const DATA_ERROR = "data() failed on demand";

// Thrown by /actions' FailingComponent(), then logged by rsc() in the browser
const RSC_LOAD_ERROR = "FailingComponent failed on demand";
const RSC_LOAD_ERROR_LOG = "[vike-react-rsc] rsc() couldn't load the server component";

// Logged on the server by testUnknownAction()
const UNKNOWN_ACTION_LOG = "[vike-react-rsc] Couldn't load the server action";

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
      // testActionBodyLimit()
      (logSource === "stderr" && logText.includes("HTTP response ← /todos 413")) ||
      // testActionValueSurvivesDataError()
      (logSource === "stderr" &&
        (logText.includes(DATA_ERROR) || logText.includes("HTTP response ← /actions 500"))) ||
      // testActionPageFailure()
      (logSource === "Browser Error" && logText.includes("status of 404")) ||
      // testRscLoadError(): in dev, Vite also forwards the browser's log to the server's stderr
      (logSource === "stderr" && logText.includes(RSC_LOAD_ERROR)) ||
      logText.includes(RSC_LOAD_ERROR_LOG) ||
      (logSource === "Browser Error" && logText.includes("status of 500")) ||
      // testUnknownAction()
      (logSource === "stderr" && logText.includes(UNKNOWN_ACTION_LOG)) ||
      // testErrorOverlay()
      (isDev && logSource === "stderr" && logText.includes("Adjacent JSX elements must be wrapped")) ||
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
  testUsePageContext();
  testWrapper();
  testHead();
  // plugin-rsc has no client JS to preload in dev
  if (!isDev) testClientJsPreload();
  testClientCss();
  if (isDev) testClientCssLinkRemoved();
  testMisuse();
  // A static host has no server: nothing renders per request, and server actions can't run.
  if (!isStatic) {
    testPageLoading();
    testOneRender();
    testClientDisconnect();
    testCounter();
    testTodoForm();
    testSession();
    testActionOnce();
    testActionValueSurvivesDataError();
    testActionPageFailure();
    testStaleAction();
    testActionRedirectToScript();
    testUnknownAction();
    testFormBeforeHydration();
    testCrossSiteAction();
    testActionBodyLimit();
    testRscComponentCall();
    testRscPropsChange();
    testRscLoadError();
    testRscLoadRedirect();
    testRscCache();
    testRscCacheInvalidation();
    testRscCacheInvalidationOnRejection();
    testRscCacheKey();
  } else {
    testStaticHostAction();
  }
  testNavigationRequests();
  testPageNavigation();
  testPendingPage();
  testNavigationKeepsPage();
  if (isDev) testErrorOverlay();
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

function testCssProp() {
  test("css prop is transformed", async () => {
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
// No script file loads, so the page never hydrates; React's inline scripts still reveal streamed content
async function withoutScripts(run: (noJs: typeof page) => Promise<void>) {
  const context = await page.context().browser()!.newContext();
  await context.route("**/*", (route) => (route.request().resourceType() === "script" ? route.abort() : route.continue()));
  try {
    await run(await context.newPage());
  } finally {
    await context.close();
  }
}

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

    // The action clears the cookie, then throws redirect("/"): a client navigation, not a document load
    const timeOrigin = await page.evaluate(() => performance.timeOrigin);
    await page.click('button:has-text("Log out")');
    await autoRetry(async () => {
      expect(new URL(page.url()).pathname).to.equal("/");
      expect(await page.textContent("h1")).to.include("Vike React Server Components");
    });
    expect(await session()).to.equal(undefined);
    expect(await page.evaluate(() => performance.timeOrigin)).to.equal(timeOrigin);
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

function testRscPropsChange() {
  test("rsc(): new props load the server component again, and a cached one keeps the client state inside it", async () => {
    await page.goto(getServerUrl() + "/suspense");
    await waitForHydration("View Details");
    await page.click('button:has-text("View Details")');
    // The details' title is the only h2 with a film's name; the cards use h3
    const detailsTitle = page.locator("h2", { hasText: /A New Hope|The Empire Strikes Back/ });
    const showFilm = async (title: string) => {
      await autoRetry(
        async () => {
          expect(await detailsTitle.textContent()).to.equal(title);
        },
        { timeout: 15000 }
      );
    };
    await showFilm("A New Hope");
    await page.click('button:has-text("Next film")');
    // The fallback, not the first film, until the second one arrives
    expect(await detailsTitle.count()).to.equal(0);
    await showFilm("The Empire Strikes Back");

    // Both films are cached now: "Next film" renders the second one into the first one's tree
    await page.click('button[aria-label="Close modal"]');
    await page.click('button:has-text("View Details")');
    await showFilm("A New Hope");
    await page.click('button:has-text("Show the opening crawl")');
    await page.click('button:has-text("Next film")');
    await showFilm("The Empire Strikes Back");
    expect(await page.locator('button:has-text("Hide the opening crawl")').count()).to.equal(1);
  });
}

function testRscLoadError() {
  test("rsc(): a failed load keeps the fallback, without an unhandled rejection", async () => {
    await page.goto(getServerUrl() + "/actions");
    await waitForHydration("Slow save");
    const pageErrors: Error[] = [];
    const onPageError = (error: Error) => pageErrors.push(error);
    page.on("pageerror", onPageError);
    const logged = page.waitForEvent("console", (message) => message.text().includes(RSC_LOAD_ERROR_LOG));
    await page.click('button:has-text("Load a failing server component")');
    await logged;
    // An unhandled rejection is reported after the log
    await sleep(500);
    page.off("pageerror", onPageError);
    expect(pageErrors.map((error) => error.message)).to.deep.equal([]);
    expect(await page.textContent("[data-rsc-fallback]")).to.equal("Not loaded");
  });
}

function testRscLoadRedirect() {
  test("rsc(): a load that redirected isn't cached, so coming back loads the server component", async () => {
    await page.goto(getServerUrl() + "/actions");
    await waitForHydration("Slow save");
    await page.click('button:has-text("Load a redirecting server component")');
    await page.waitForURL(getServerUrl() + "/");
    await page.goBack();
    await waitForHydration("Slow save");
    await page.click('button:has-text("Load a redirecting server component")');
    await autoRetry(async () => {
      expect(await page.textContent("[data-rsc-redirecting]")).to.equal("Loaded");
    });
  });
}

function testStaticHostAction() {
  test("Server action: a static host's answer rejects the call with its status", async () => {
    await page.goto(getServerUrl() + "/actions");
    await waitForHydration("Slow save");
    await page.click('button:has-text("Save, then data() throws")');
    await autoRetry(async () => {
      expect(await page.textContent("[data-result]")).to.equal("Rejected: [vike-react-rsc] Server action failed: HTTP 404");
    });
  });
}

function testActionRedirectToScript() {
  test("Server action: a redirect to a javascript: URL rejects the call and runs nothing", async () => {
    await page.goto(getServerUrl() + "/actions");
    await waitForHydration("Slow save");
    await page.click('button:has-text("Redirect to a javascript: URL")');
    await autoRetry(async () => {
      expect(await page.textContent("[data-result]")).to.equal(
        "Rejected: [vike-react-rsc] The server action redirected to javascript:void(window.__redirected=1), which isn't an http(s) URL"
      );
    });
    expect(await page.evaluate(() => "__redirected" in window)).to.equal(false);
  });
}

function testUnknownAction() {
  test("Server action: an id the server doesn't know reloads the page once, then rejects the call", async () => {
    // As if the tab predates a deploy that removed the action. A reload undoes it.
    const callUnknownId = (unknownId: string) =>
      page.evaluate((unknownId) => {
        const { fetch } = window;
        window.fetch = (input, init) =>
          fetch(input, { ...init, headers: { ...(init?.headers as Record<string, string>), "x-rsc-action": unknownId } });
      }, unknownId);
    const unknownId = `/gone.ts#action${Date.now()}`;
    await page.goto(getServerUrl() + "/actions");
    await waitForHydration("Slow save");
    await callUnknownId(unknownId);
    const timeOrigin = await page.evaluate(() => performance.timeOrigin);
    await page.click('button:has-text("Save, then data() throws")');
    await autoRetry(async () => {
      expect(await page.evaluate(() => performance.timeOrigin)).to.not.equal(timeOrigin);
    });
    await waitForHydration("Slow save");
    await callUnknownId(unknownId);
    await page.click('button:has-text("Save, then data() throws")');
    await autoRetry(async () => {
      expect(await page.textContent("[data-result]")).to.equal("Rejected: [vike-react-rsc] Server action failed: HTTP 404");
    });
  });
}

function testFormBeforeHydration() {
  test("Server action: a form submitted before hydration runs it, and useActionState() keeps its state", async () => {
    await withoutScripts(async (noJs) => {
      // The action sets the cookie, then the guard of /login redirects to /account
      await noJs.goto(getServerUrl() + "/login");
      await noJs.click('button:has-text("Log in")');
      await noJs.waitForURL((url) => url.pathname === "/account");
      expect(await noJs.textContent("#account-user")).to.equal("Logged in as alice");

      await noJs.goto(getServerUrl() + "/actions");
      await noJs.click('button:has-text("Count a submit")');
      await noJs.waitForSelector("[data-submits]:has-text('Submitted 1 times')");
      await noJs.click('button:has-text("Count a submit")');
      await noJs.waitForSelector("[data-submits]:has-text('Submitted 2 times')");
    });

    // form.submit() skips React's handler, as a submit before hydration does: the page hydrates with the state the
    // server rendered, then counts on
    await page.goto(getServerUrl() + "/actions");
    await waitForHydration("Slow save");
    await Promise.all([
      page.waitForNavigation(),
      page.evaluate(() => document.querySelector("form")!.submit()),
    ]);
    await waitForHydration("Count a submit");
    expect(await page.textContent("[data-submits]")).to.equal("Submitted 1 times");
    await page.click('button:has-text("Count a submit")');
    await autoRetry(async () => {
      expect(await page.textContent("[data-submits]")).to.equal("Submitted 2 times");
    });
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

function testActionBodyLimit() {
  test("Server action: a body over rsc.bodySizeLimit is refused, even without a Content-Length", async () => {
    // The default limit is 1 MB; this streams 2 MB
    const chunk = new Uint8Array(64 * 1024).fill(97);
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent >= 2 * 1024 * 1024) return controller.close();
        sent += chunk.byteLength;
        controller.enqueue(chunk);
      },
    });
    const response = await fetch(getServerUrl() + "/todos", {
      method: "POST",
      headers: { "x-rsc-action": "any", "content-type": "text/plain" },
      body,
      duplex: "half",
    } as RequestInit);
    expect(response.status).to.equal(413);
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
    const inlineScripts = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>[^<]*/g)].map(([script]) => script);
    // React's own, for the streamed boundary, besides Vike's
    expect(inlineScripts.some((script) => !/vike/i.test(script))).to.equal(true);
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

// What the server rendered and ran so far, from /counts (src/serverCounts.ts)
async function getServerCount(key: string): Promise<number> {
  const html = await fetchHtml("/counts");
  const match = new RegExp(`data-count="${key}">(\\d+)<`).exec(html);
  return match ? Number(match[1]) : 0;
}

function testUsePageContext() {
  test("usePageContext() in a client component", async () => {
    expect(await fetchHtml("/client")).to.match(/data-url-pathname="">\/client</);
    await page.goto(getServerUrl() + "/client");
    expect(await page.textContent("[data-url-pathname]")).to.equal("/client");
  });
}

function testWrapper() {
  test("Wrapper wraps the Layout", async () => {
    await page.goto(getServerUrl() + "/");
    // A pre-rendered page reveals its layout with React's inline script, a few ms after load
    await autoRetry(async () => {
      expect(await page.locator("[data-wrapper] header").count()).to.equal(1);
    });
  });
}

function testHead() {
  test("Head sets the document's head", async () => {
    expect(await fetchHtml("/")).to.include("<title>Vike RSC demo</title>");
    await page.goto(getServerUrl() + "/");
    expect(await page.title()).to.equal("Vike RSC demo");
  });
}

function testClientJsPreload() {
  // The first render of a client component, as after a server start, and in every pre-rendered page
  test("The head preloads the JS of the client components a page renders", async () => {
    const html = await fetchHtml("/client-css");
    const head = html.slice(0, html.indexOf("</head>"));
    const hrefs = [...head.matchAll(/<link rel="modulepreload" href="([^"]+)"/g)].map((match) => match[1]!);
    const responses = await Promise.all(hrefs.map((href) => fetch(getServerUrl() + href)));
    expect(responses.filter((response) => !response.ok).map((response) => response.url)).to.deep.equal([]);
    const chunks = await Promise.all(responses.map((response) => response.text()));
    expect(chunks.some((chunk) => chunk.includes("Styled by a client component's CSS"))).to.equal(true);
  });
}

function testClientCss() {
  test("A client component's CSS applies before hydration", async () => {
    // Without JavaScript, the page shows what the server rendered
    const context = await page.context().browser()!.newContext({ javaScriptEnabled: false });
    const noJsPage = await context.newPage();
    await noJsPage.goto(getServerUrl() + "/client-css");
    const color = (selector: string) => noJsPage.$eval(selector, (element) => getComputedStyle(element).color);
    expect(await color("[data-styled-client]")).to.equal("rgb(0, 128, 0)");
    // The CSS of a client component it imports
    expect(await color("[data-nested-client]")).to.equal("rgb(0, 0, 128)");
    await context.close();
  });
}

function testClientCssLinkRemoved() {
  test("In dev, a client component's CSS link goes once Vite has injected the CSS", async () => {
    // Else, removing the CSS import wouldn't remove its styles until a reload
    await page.goto(getServerUrl() + "/client-css");
    await autoRetry(async () => {
      expect(await page.$$('link[href*="StyledClient.css"]')).to.have.length(0);
    });
    expect(await page.$eval("[data-styled-client]", (element) => getComputedStyle(element).color)).to.equal(
      "rgb(0, 128, 0)"
    );
  });
}

function testMisuse() {
  test("getPageContext(), rerender() and getResponseHeaders() throw where they can't work", async () => {
    const html = await fetchHtml("/misuse");
    const error = (call: string) => new RegExp(`data-misuse="${call}">([^<]*)<`).exec(html)?.[1];
    expect(error("getPageContext")).to.equal(
      "[vike-react-rsc] getPageContext() needs a server component render or a server action, and neither runs here"
    );
    expect(error("rerender")).to.equal("[vike-react-rsc] rerender() needs a running server action, and none runs here");
    expect(error("getResponseHeaders")).to.equal(
      "[vike-react-rsc] getResponseHeaders() needs a running server action, and none runs here"
    );
    // The same message from data(), which runs outside the rsc env
    expect(error("data:rerender")).to.equal(error("rerender"));
    expect(error("data:getResponseHeaders")).to.equal(error("getResponseHeaders"));
  });
}

function testPageLoading() {
  test("Loading.layout streams before the page it waits for", async () => {
    // /data waits two seconds for its films
    const html = await fetchHtml("/data");
    const fallback = html.search(/<div[^>]*data-loading-layout/);
    expect(fallback, "fallback missing from response").to.not.equal(-1);
    expect(html.indexOf("Page-Level Loading")).to.be.greaterThan(fallback);
  });
}

function testOneRender() {
  test("One render per page load feeds the HTML and the browser", async () => {
    const before = await getServerCount("render /");
    await fetchHtml("/");
    expect(await getServerCount("render /")).to.equal(before + 1);
  });
}

function testClientDisconnect() {
  test("A client leaving mid-stream stops the render, and isn't logged as an error", async () => {
    // Staying renders /slow's Suspense boundary, which resolves after 1.5 seconds
    const before = await getServerCount("slow");
    await fetchHtml("/slow");
    expect(await getServerCount("slow")).to.equal(before + 1);

    // Leaving after the first bytes, before it resolves
    const controller = new AbortController();
    const response = await fetch(getServerUrl() + "/slow", { signal: controller.signal });
    await response.body!.getReader().read();
    controller.abort();
    await sleep(2500);
    expect(await getServerCount("slow")).to.equal(before + 1);
  });
}

function testActionOnce() {
  test("Server action: runs once when guard() throws render()", async () => {
    // Without a name, the guard of /account throws render("/login") after the action
    await page.goto(getServerUrl() + "/account");
    await waitForHydration("Log in");
    const before = await getServerCount("login");
    await page.fill('input[name="user"]', "");
    const response = page.waitForResponse((response) => response.request().method() === "POST");
    await page.click('button:has-text("Log in")');
    // The action runs before the answer starts
    await response;
    expect(await getServerCount("login")).to.equal(before + 1);
    expect(await page.textContent("h1")).to.equal("Log in");
  });
}

function testActionValueSurvivesDataError() {
  test("Server action: without rerender(), its value survives a data() error", async () => {
    await page.goto(getServerUrl() + "/actions");
    await waitForHydration("Slow save");
    await page.click('button:has-text("Save, then data() throws")');
    await autoRetry(async () => {
      expect(await page.textContent("[data-result]")).to.equal("Returned: saved");
    });
  });
}

function testActionPageFailure() {
  test("Server action: a 404 instead of the page rejects the call", async () => {
    await page.goto(getServerUrl() + "/actions");
    await waitForHydration("Slow save");
    await page.click('button:has-text("Save, then guard() throws render(404)")');
    await autoRetry(async () => {
      expect(await page.textContent("[data-result]")).to.equal(
        "Rejected: [vike-react-rsc] Server action failed: HTTP 404"
      );
    });
  });
}

function testStaleAction() {
  test("Server action: a navigation during the action keeps the new page", async () => {
    await page.goto(getServerUrl() + "/actions");
    await waitForHydration("Slow save");
    const returned = page.waitForEvent("console", (message) => message.text() === "Returned: saved");
    let hasResponded = false;
    void page
      .waitForResponse((response) => response.request().method() === "POST")
      .then(() => (hasResponded = true));

    await page.click('button:has-text("Slow save")');
    await page.click('a[href="/"]');
    await autoRetry(async () => {
      expect(await page.textContent("h1")).to.include("Vike React Server Components");
    });
    expect(hasResponded, "the navigation must end before the action returns").to.equal(false);

    // The caller still gets the value, and the page the action rendered isn't shown
    await returned;
    await sleep(500);
    expect(await page.textContent("h1")).to.include("Vike React Server Components");
  });
}

// The rsc() components of /suspense (components/LoadCount): each server render shows a higher count
function trackRscRequests() {
  const requests: string[] = [];
  page.on("request", (request) => {
    const action = request.headers()["x-rsc-action"];
    if (request.method() === "POST" && action) requests.push(action);
  });
  return requests;
}
const readLoadCounts = () => page.locator("[data-load-count]").allTextContents();
const toggleLoadCounts = () => page.click('button:has-text("server counts")');

async function showLoadCounts() {
  await page.goto(getServerUrl() + "/suspense");
  await waitForHydration("Show server counts");
  const requests = trackRscRequests();
  await toggleLoadCounts();
  // Loading.component until the server component arrives
  expect(await page.locator("[data-loading-component]").count()).to.equal(2);
  await autoRetry(async () => {
    expect(await readLoadCounts()).to.have.length(2);
  });
  // The two components shared one request
  expect(requests).to.have.length(1);
  const [first, second] = await readLoadCounts();
  expect(first).to.equal(second);
  return requests;
}

// No page links to /actions. Vike's client router handles any link, so the rsc() cache survives the navigation.
async function navigateToActions() {
  await page.evaluate(() =>
    document.body.append(Object.assign(document.createElement("a"), { href: "/actions", textContent: "Actions" }))
  );
  await page.click('a[href="/actions"]');
  await waitForHydration("Slow save");
}

function testRscCache() {
  test("rsc(): cached for rsc.staleTime, then revalidated", async () => {
    const requests = await showLoadCounts();
    const loadedAt = Date.now();
    const loaded = await readLoadCounts();

    // A fresh cache entry renders at once, without a request
    await toggleLoadCounts();
    await toggleLoadCounts();
    expect(await page.locator("[data-loading-component]").count()).to.equal(0);
    expect(await readLoadCounts()).to.deep.equal(loaded);
    expect(requests).to.have.length(1);

    // After `rsc: { staleTime: 10000 }` (+config.ts), the stale entry renders while it's refetched
    await sleep(Math.max(0, loadedAt + 10000 - Date.now()));
    await toggleLoadCounts();
    await toggleLoadCounts();
    expect(await readLoadCounts()).to.deep.equal(loaded);
    await autoRetry(async () => {
      expect(await readLoadCounts()).to.not.deep.equal(loaded);
    });
    expect(requests).to.have.length(2);
  });
}

function testRscCacheInvalidation() {
  test("rsc(): another server action marks the cache stale", async () => {
    const requests = await showLoadCounts();
    const loaded = await readLoadCounts();

    await page.click('button:has-text("Run a server action")');
    // Not response.finished(): Chrome can report a fully read no-store response as canceled, and finished() then never resolves
    await page.waitForSelector("[data-ran-action]");
    await toggleLoadCounts();
    await toggleLoadCounts();
    expect(await readLoadCounts()).to.deep.equal(loaded);
    await autoRetry(async () => {
      expect(await readLoadCounts()).to.not.deep.equal(loaded);
    });
    // The load, the action, the refetch
    expect(requests).to.have.length(3);
  });
}

function testRscCacheInvalidationOnRejection() {
  test("rsc(): a server action that ran, then rejected, marks the cache stale", async () => {
    await showLoadCounts();
    const loaded = await readLoadCounts();
    await navigateToActions();
    // It saves, then the 404 rejects the call
    await page.click('button:has-text("Save, then guard() throws render(404)")');
    await autoRetry(async () => {
      expect(await page.textContent("[data-result]")).to.include("HTTP 404");
    });
    await page.click('a[href="/suspense"]');
    await waitForHydration("Show server counts");
    const requests = trackRscRequests();
    await toggleLoadCounts();
    await autoRetry(async () => {
      expect(await readLoadCounts()).to.not.deep.equal(loaded);
    });
    expect(requests).to.have.length(1);
  });
}

function testRscCacheKey() {
  test("rsc(): another server component with the same props doesn't show the cached one", async () => {
    await showLoadCounts();
    await navigateToActions();
    const logged = page.waitForEvent("console", (message) => message.text().includes(RSC_LOAD_ERROR_LOG));
    // FailingComponent and LoadCount both have no props
    await page.click('button:has-text("Load a failing server component")');
    await autoRetry(async () => {
      expect(await page.locator("[data-rsc-fallback]").count()).to.equal(1);
    });
    expect(await page.locator("[data-load-count]").count()).to.equal(0);
    // FailingComponent's own load ran
    await logged;
  });
}

function testPendingPage() {
  test("A navigation that ends before React commits the hydration shows its page", async () => {
    // /hydration has no Loading.layout, so React commits its hydration only once its client component has loaded
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    await page.route("**/*", async (route) => {
      if (route.request().resourceType() !== "script") return route.continue();
      const response = await route.fetch();
      if ((await response.text()).includes("data-hydration-client")) await released;
      await route.fulfill({ response });
    });

    // /hydration's onHydrationEnd() navigates to /
    await page.goto(getServerUrl() + "/hydration", { waitUntil: "commit" });
    await page.waitForURL((url) => url.pathname === "/");
    await sleep(500);
    release();
    await autoRetry(async () => {
      expect(await page.textContent("h1")).to.include("Vike React Server Components");
    });
    await page.unroute("**/*");
  });
}

function testNavigationKeepsPage() {
  test("A navigation keeps the current page until the next page's client components have loaded", async () => {
    await page.goto(getServerUrl() + "/");
    await waitForHydration();
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    let isHeld = false;
    await page.route("**/*", async (route) => {
      if (route.request().resourceType() !== "script") return route.continue();
      const response = await route.fetch();
      if ((await response.text()).includes("data-url-pathname")) {
        isHeld = true;
        await released;
      }
      await route.fulfill({ response });
    });
    await page.evaluate(() =>
      document.body.append(Object.assign(document.createElement("a"), { href: "/client", textContent: "Client" }))
    );
    await page.click('a[href="/client"]');
    // /client's Page is a client component: its module is held
    await autoRetry(() => expect(isHeld).to.equal(true));
    await sleep(500);
    expect(await page.locator("[data-loading-layout]").count()).to.equal(0);
    expect(await page.textContent("h1")).to.include("Vike React Server Components");
    release();
    await autoRetry(async () => {
      expect(await page.textContent("[data-url-pathname]")).to.equal("/client");
    });
    await page.unroute("**/*");
  });
}

function testErrorOverlay() {
  test("Dev: fixing a server component's syntax error closes Vite's error overlay", async () => {
    await page.goto(getServerUrl() + "/");
    await waitForHydration();
    const overlays = page.locator("vite-error-overlay");
    editFile("./src/pages/index/+Page.tsx", (source) =>
      source.replace(">Vike React Server Components</h1>", ">Vike React Server Components</h1>{")
    );
    await autoRetry(async () => {
      expect(await overlays.count()).to.equal(1);
    });
    // Reverted within milliseconds, Vite sends no update for the fix
    await sleep(1000);
    editFileRevert();
    await autoRetry(async () => {
      expect(await overlays.count()).to.equal(0);
    });
  });
}
