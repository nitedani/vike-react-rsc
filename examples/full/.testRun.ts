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
  expectLog,
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

// React requires eval() in development and says so under a CSP without
// 'unsafe-eval'; it never uses eval() in production.
const REACT_DEV_EVAL_CSP_ERROR =
  "eval() is not supported in this environment.";

// React's dev performance track throws on aborted components until
// https://github.com/react/react/pull/37572 is released.
const REACT_DEV_PERF_TRACK_ERROR = "cannot have a negative time stamp";

// Thrown by +onCreatePageContext while testActionValueSurvivesHookError() sets its cookie
const ON_CREATE_PAGE_CONTEXT_ERROR = "+onCreatePageContext failed on demand";

// Thrown by /actions' FailingComponent(), then logged by rsc() in the browser
const RSC_LOAD_ERROR = "FailingComponent failed on demand";
const RSC_LOAD_ERROR_LOG = "[vike-react-rsc] rsc() couldn't load the server component";

// Thrown by /head-settings-throw's +title in the browser, then Vike's error page logs ERROR_PAGE_IN_BROWSER_ERROR
const HEAD_SETTING_ERROR = "+title failed in the browser on demand";

// Logged on the server by testUnknownAction()
const UNKNOWN_ACTION_LOG = "[vike-react-rsc] Couldn't load the server action";

// Thrown by /browser-error's guard() in the browser, then logged with why the error page can't render there
const BROWSER_GUARD_ERROR = "guard() failed in the browser on demand";
const ERROR_PAGE_IN_BROWSER_ERROR = "has to render in the browser, e.g. the error page after an error there";

// Thrown by /throws on the server, then logged there, and by React in the browser: in production as its error #441
const THROWS_ERROR = "A server component failed on demand";

// Logged on the server for /unserializable, whose data holds a function
const UNSERIALIZABLE_LOG = "can't be serialized and, therefore, can't be passed to the client side";

// Thrown in the browser by testServerComponentAbort()
const getRefusedRedirectError = (next: string) =>
  `[vike-react-rsc] The server redirected to ${next}, which isn't an http(s) URL`;

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
    tolerateError: ({ logSource, logText }) =>
      // Vite also forwards the browser's error to the server's stderr.
      (isDev && logText.includes(REACT_DEV_EVAL_CSP_ERROR)) ||
      (isDev && logText.includes(REACT_DEV_PERF_TRACK_ERROR)) ||
      // testCrossSiteAction()
      (logSource === "stderr" && logText.includes("HTTP response ← /todos 403")) ||
      // testActionBodyLimit()
      (logSource === "stderr" &&
        (logText.includes("HTTP response ← /todos 413") || logText.includes("HTTP response ← /actions 413"))) ||
      // testActionValueSurvivesHookError()
      (logSource === "stderr" &&
        (logText.includes(ON_CREATE_PAGE_CONTEXT_ERROR) || logText.includes("HTTP response ← /actions 500"))) ||
      // testActionPageFailure()
      (logSource === "Browser Error" && logText.includes("status of 404")) ||
      // testClientDisconnect()
      (logSource === "stderr" &&
        (logText.includes("HTTP response ← /slow-hook-throws 500") ||
          logText.includes("HTTP response ← /slow-after-hook-throws 500") ||
          logText.includes("HTTP response ← /slow-after-hook-pipes 500"))) ||
      // testRscLoadError(): in dev, Vite also forwards the browser's log to the server's stderr
      (logSource === "stderr" && logText.includes(RSC_LOAD_ERROR)) ||
      logText.includes(RSC_LOAD_ERROR_LOG) ||
      (logSource === "Browser Error" && logText.includes("status of 500")) ||
      // testUnknownAction()
      (logSource === "stderr" && logText.includes(UNKNOWN_ACTION_LOG)) ||
      // testErrorPageInBrowser(): in dev, Vite also forwards the browser's log to the server's stderr
      logText.includes(BROWSER_GUARD_ERROR) ||
      logText.includes(ERROR_PAGE_IN_BROWSER_ERROR) ||
      // testHeadSettings(): in dev, Vite also forwards the browser's console.error() to the server's stderr
      ((logSource === "Browser Error" || (isDev && logSource === "stderr")) && logText.includes(HEAD_SETTING_ERROR)) ||
      // testServerComponentThrows()
      logText.includes(THROWS_ERROR) ||
      (logSource === "Browser Error" && logText.includes("react.dev/errors/441")) ||
      // testUnserializableData()
      (logSource === "stderr" && logText.includes(UNSERIALIZABLE_LOG)) ||
      // testServerComponentAbort(): the redirect an app's error boundary caught, as React logs it in dev and in production
      ((logSource === "Browser Error" || (isDev && logSource === "stderr" && logText.includes("[vite][console.error]"))) &&
        logText.includes("Error: AbortRender")) ||
      (logSource === "Browser Error" && logText.includes("Minified React error #441")) ||
      // testServerComponentAbort(), with React's warning for it. In dev, Vite also forwards both to the server's stderr.
      logText.includes("[vike-react-rsc] The server redirected to") ||
      logText.includes("An error occurred in the <Redirect> component") ||
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
  testCspNonce(isStatic);
  testResponseTail();
  testUsePageContext();
  testWrapper();
  testHead();
  testOnAfterRenderHtml();
  testHeadSettings(isStatic);
  // plugin-rsc has no client JS to preload in dev
  if (!isDev) testClientJsPreload();
  testClientCss();
  if (isDev) testClientCssLinkRemoved();
  testMisuse();
  testServerLoading();
  testSsrFalse(isStatic);
  testUnserializableData(isStatic);
  // A static host has no server: nothing renders per request, and server actions can't run.
  if (!isStatic) {
    testPageLoading();
    testOneRender();
    testClientDisconnect();
    testCounter();
    testTodoForm();
    testHeadSettingsRerender();
    testSession();
    testGonePassToClientValue();
    testConcurrentRerender();
    testActionOnce();
    testActionSkipsData();
    testActionRequestContext();
    testActionValueSurvivesHookError();
    testActionPageFailure();
    testStaleAction();
    testActionAbort();
    testUnknownAction();
    testFormBeforeHydration();
    testCrossSiteAction();
    testActionBodyLimit();
    testRscComponentCall();
    testRscPropsChange();
    testRscLoadError();
    testRscLoadRedirect();
    testRscLoadReadsData();
    testServerComponentAbort();
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
  testErrorPageInBrowser();
  // /throws isn't pre-rendered: a static host has neither its HTML nor its pageContext
  if (!isStatic) testServerComponentThrows();
  if (isDev) testErrorOverlay();
  if (isDev) testServerCssHmr();
}

// Each stream keeps its own order, and the HTML stays open until the Flight's end marker
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

// What a browser sends for a form submitted before hydration: Node's fetch() always sends `sec-fetch-mode: cors`
function submitForm(pathname: string, form: FormData) {
  return page.request.post(getServerUrl() + pathname, {
    multipart: form,
    headers: { "sec-fetch-mode": "navigate" },
    maxRedirects: 0,
  });
}

// Until React has attached the button's handlers, a click doesn't do what a user's would
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
    await waitForHydration();

    // The client component's display container; its only child holds the count.
    const readCount = async () =>
      Number(await page.textContent("[data-shared-util-client] div"));

    // The count is the server's, shared by every run: it only has to grow
    const before = await readCount();
    await page.click('button:has-text("Increment")');
    await autoRetry(
      async () => {
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
    const readTodoCount = async (selector = "#todo-count") =>
      Number((await page.textContent(selector))?.match(/\d+/)?.[0]);
    const countBefore = await readTodoCount();
    expect(await readTodoCount("#todo-count-client")).to.equal(countBefore);
    expect(await readTodoCount("#todo-count-streamed")).to.equal(countBefore);
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
    // Client components get the new pageContext too
    expect(await readTodoCount("#todo-count-client")).to.equal(countBefore + 1);
    expect(await page.textContent("#todo-count-client")).to.include("Task Manager");
    expect(await readTodoCount("#todo-count-streamed")).to.equal(countBefore + 1);
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
    const middlewareRuns = await getServerCount("middleware /account");
    await page.click('button:has-text("Log in")');
    await autoRetry(async () => {
      expect(await page.textContent("#account-user")).to.equal("Logged in as alice");
    });
    const session = async () =>
      (await page.context().cookies()).find((c) => c.name === "session")?.value;
    expect(await session()).to.equal("alice");

    // The page its re-render shows has the context of the +middleware ordered after the action middleware, which ran
    // once, like a page request's
    expect(await getServerCount("middleware /account")).to.equal(middlewareRuns + 1);
    expect(await page.textContent("#account-mw")).to.equal("POST");
    await page.goto(getServerUrl() + "/account");
    await waitForHydration("Log out");
    expect(await page.textContent("#account-mw")).to.equal("GET");
    await showLoadCounts();
    const loaded = await readLoadCounts();
    await clickNewLink("/account");
    await waitForHydration("Log out");

    // The action clears the cookie, then throws redirect("/"): a client navigation, not a document load
    const timeOrigin = await page.evaluate(() => performance.timeOrigin);
    await page.click('button:has-text("Log out")');
    await autoRetry(async () => {
      expect(new URL(page.url()).pathname).to.equal("/");
      expect(await page.textContent("h1")).to.include("Vike React Server Components");
    });
    expect(await session()).to.equal(undefined);
    expect(await page.evaluate(() => performance.timeOrigin)).to.equal(timeOrigin);
    // An action's redirect keeps the page in history
    await page.goBack();
    await waitForHydration("Log in");
    expect(new URL(page.url()).pathname).to.equal("/account");
    // The redirect came from the action, not from an rsc() output, so the cached outputs show until they refresh
    await page.goBack();
    await waitForHydration("Show server counts");
    await toggleLoadCounts();
    expect(await page.locator("[data-loading-component]").count()).to.equal(0);
    expect(await readLoadCounts()).to.deep.equal(loaded);
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

  test("Server action: a +middleware ordered before the action middleware redirects it", async () => {
    await page.goto(getServerUrl() + "/actions");
    await waitForHydration("Slow save");
    // The app's auth middleware answers with a 302
    await page.context().addCookies([{ name: "expired", value: "1", url: getServerUrl() }]);
    await page.click('button:text-is("Save")');
    await autoRetry(async () => {
      expect(new URL(page.url()).pathname).to.equal("/login");
      expect(await page.textContent("h1")).to.equal("Log in");
    });
    await page.context().clearCookies({ name: "expired" });
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
  test("rsc(): a load that redirected doesn't stay in history and isn't cached, so coming back loads the server component", async () => {
    await page.goto(getServerUrl() + "/todos");
    await waitForHydration("Add Task");
    await navigateToActions();
    await page.click('button:has-text("Load a redirecting server component")');
    await page.waitForURL(getServerUrl() + "/");
    await page.waitForSelector('h1:has-text("Vike React Server Components")');
    await page.goBack();
    await autoRetry(async () => {
      expect(new URL(page.url()).pathname).to.equal("/todos");
    });
    await waitForHydration("Add Task");
    await navigateToActions();
    await page.click('button:has-text("Load a redirecting server component")');
    await autoRetry(async () => {
      expect(await page.textContent("[data-rsc-redirecting]")).to.equal("Loaded");
    });
  });
}

function testRscLoadReadsData() {
  test("rsc(): the server components a load returns read the page's data()", async () => {
    await page.goto(getServerUrl() + "/actions");
    await waitForHydration("Slow save");
    await page.click('button:has-text("Load a server component that reads data()")');
    await autoRetry(async () => {
      expect(await page.textContent("[data-rsc-page-data]")).to.equal('{"from":"data()"}');
    });
  });
}

function testServerComponentAbort() {
  test("Server component: throw redirect() before the HTML starts is a 302", async () => {
    const response = await fetch(getServerUrl() + "/abort/redirect", { redirect: "manual" });
    expect([response.status, response.headers.get("location")]).to.deep.equal([302, "/"]);
    // A crawler gets the whole page at once, so inside <Suspense> too
    const crawled = await fetch(getServerUrl() + "/abort/redirect-streamed", {
      redirect: "manual",
      headers: { "user-agent": "Googlebot/2.1" },
    });
    expect([crawled.status, crawled.headers.get("location")]).to.deep.equal([302, "/"]);
  });

  test("Server component: throw render(404) before the HTML starts is the error page, with its status", async () => {
    const response = await fetch(getServerUrl() + "/abort/not-found");
    expect(response.status).to.equal(404);
    expect(await response.text()).to.include("Page not found");
  });

  test("Server component: throw render(url, reason) before the HTML starts shows that page, with the reason", async () => {
    const html = await fetchHtml("/abort/rewrite");
    // Its Date arrives as a Date, as from guard()
    expect(html).to.include('id="abort-reason">Rewritten by a server component, at 2026-10-19T00:00:00.000Z<');
  });

  test("Server component: throw redirect() inside <Suspense> loads the target once, with or without JavaScript", async () => {
    const html = await fetchHtml("/abort/redirect-streamed");
    expect(html).to.match(/<meta http-equiv="refresh" content="0;url=\/"/);
    expect(html).to.include('<meta name="robots" content="noindex"/>');

    const requests: string[] = [];
    const onRequest = (request: { url(): string; resourceType(): string }) => {
      if (["document", "fetch", "xhr"].includes(request.resourceType())) requests.push(new URL(request.url()).pathname);
    };
    page.on("request", onRequest);
    const consoleErrors = trackConsoleErrors();
    // The target answers late, so the page hydrates while the meta's navigation waits for it
    const target = getServerUrl() + "/";
    await page.route(target, async (route) => {
      await sleep(2000);
      await route.continue();
    });
    await page.goto(getServerUrl() + "/abort/redirect-streamed");
    await page.waitForURL(target);
    await waitForHydration();
    await page.unroute(target);
    page.off("request", onRequest);
    expect(requests).to.deep.equal(["/abort/redirect-streamed", "/"]);
    expect(consoleErrors.stop()).to.deep.equal([]);

    await withoutScripts(async (noJs) => {
      await noJs.goto(getServerUrl() + "/abort/redirect-streamed");
      await noJs.waitForURL(getServerUrl() + "/");
    });
  });

  // Neither the HTML's meta nor the browser follows it, and the browser reports it
  const expectRedirectRefused = async (next: string) => {
    const href = `/abort/redirect-to-next?next=${encodeURIComponent(next)}`;
    const html = await fetchHtml(href);
    expect(html).to.include('<meta name="robots" content="noindex"/>');
    expect(html).to.not.include('http-equiv="refresh"');

    await page.goto(getServerUrl() + "/todos");
    await waitForHydration("Add Task");
    // React throws it while rendering, after the navigation ended, so the React root's onUncaughtError logs it
    const logged = page.waitForEvent("console", (message) => message.type() === "error" && message.text().includes(getRefusedRedirectError(next)));
    await clickNewLink(href);
    await logged;
    expect(new URL(page.url()).pathname).to.equal("/abort/redirect-to-next");
  };

  test("Server component: throw redirect() to a javascript: URL runs nothing", async () => {
    await expectRedirectRefused("javascript:void(window.__redirected=1)");
    expect(await page.evaluate(() => "__redirected" in window)).to.equal(false);
  });

  test("Server component: throw redirect() to a URL that doesn't parse is refused, and the server doesn't throw", async () => {
    await expectRedirectRefused("//[");
  });

  test("Server component: an error boundary of the app's that catches a throw redirect() logs it on a client navigation, not on a first load the HTML redirects", async () => {
    await page.goto(getServerUrl() + "/todos");
    await waitForHydration("Add Task");
    const logged = page.waitForEvent("console", (message) => message.type() === "error");
    await clickNewLink("/abort/redirect-caught");
    await logged;
    expect(await page.textContent("[data-boundary-fallback]")).to.equal("Caught");
    expect(new URL(page.url()).pathname).to.equal("/abort/redirect-caught");

    // On a first load the HTML's meta still redirects, so there is nothing to report. The target answers late, so the page hydrates and the boundary catches the redirect first
    const consoleErrors = trackConsoleErrors();
    const target = getServerUrl() + "/";
    await page.route(target, async (route) => {
      await sleep(2000);
      await route.continue();
    });
    await page.goto(getServerUrl() + "/abort/redirect-caught");
    await page.waitForURL(target);
    await page.unroute(target);
    expect(consoleErrors.stop()).to.deep.equal([]);
  });

  // Each one leaves for the target with a client navigation, not a document load, keeps the page shown until the
  // target renders, and logs no error
  const expectRedirectedHome = async (leave: () => Promise<void>) => {
    const timeOrigin = await page.evaluate(() => performance.timeOrigin);
    const consoleErrors = trackConsoleErrors();
    const isTarget = (url: URL) => url.pathname === "/index.pageContext.json";
    let isPageShownWhileTargetLoads: boolean | undefined;
    await page.route(isTarget, async (route) => {
      isPageShownWhileTargetLoads = await page.isVisible('header a:has-text("Vike RSC")');
      await route.continue();
    });
    await leave();
    await autoRetry(async () => {
      expect(new URL(page.url()).pathname).to.equal("/");
      expect(await page.textContent("h1")).to.include("Vike React Server Components");
    });
    await page.unroute(isTarget);
    expect(isPageShownWhileTargetLoads).to.equal(true);
    expect(await page.evaluate(() => performance.timeOrigin)).to.equal(timeOrigin);
    expect(consoleErrors.stop()).to.deep.equal([]);
  };

  test("Server component: throw redirect() on a client navigation, which doesn't stay in history", async () => {
    await page.goto(getServerUrl() + "/todos");
    await waitForHydration("Add Task");
    await expectRedirectedHome(() => clickNewLink("/abort/redirect"));
    await page.goBack();
    await autoRetry(async () => {
      expect(new URL(page.url()).pathname).to.equal("/todos");
    });
    await waitForHydration("Add Task");
  });

  test("Server component: throw redirect() on an rsc() load the page starts on mount, which doesn't stay in history", async () => {
    for (const href of ["/abort/redirect-on-load", "/abort/redirect-on-load?in=server-function"]) {
      await page.goto(getServerUrl() + "/todos");
      await waitForHydration("Add Task");
      await expectRedirectedHome(() => clickNewLink(href));
      await page.goBack();
      await autoRetry(async () => {
        expect(new URL(page.url()).pathname).to.equal("/todos");
      });
      await waitForHydration("Add Task");
    }
  });

  test("Server component: throw redirect() in what an rsc() load renders, or in its server function, doesn't stay in history after a server action, with rerender() or without, and coming back loads it again", async () => {
    const saveWithRerender = async () => {
      await page.click('button:has-text("Slow save")');
      await page.waitForSelector("[data-result]:has-text('Returned: saved')");
    };
    const countSubmit = async () => {
      await page.click('button:has-text("Count a submit")');
      await page.waitForSelector("[data-submits]:has-text('Submitted 1 times')");
    };
    // The first panel's redirect comes from AbortBoundary, then from callServer()
    for (const [runAction, button] of [
      // The panels load after the page the answer sent, so their redirect isn't the action's
      [saveWithRerender, "Load a server component whose child redirects"],
      [countSubmit, "Load a server component that redirects, then ones whose child redirects"],
    ] as const) {
      await page.goto(getServerUrl() + "/todos");
      await waitForHydration("Add Task");
      await navigateToActions();
      await runAction();
      const loadPanels = () => page.click(`button:has-text("${button}")`);
      await expectRedirectedHome(loadPanels);
      // The 1000 ms child answers before Back, the 3000 ms one is still loading at the next click
      await sleep(1000);
      // The children don't redirect anymore, but the outputs that redirected are still fresh
      await page.goBack();
      await autoRetry(async () => {
        expect(new URL(page.url()).pathname).to.equal("/todos");
      });
      await waitForHydration("Add Task");
      await navigateToActions();
      await loadPanels();
      await autoRetry(async () => {
        expect(await page.locator("[data-rsc-redirecting-child]").allTextContents()).to.deep.equal(["Loaded", "Loaded", "Loaded"]);
      });
      expect(new URL(page.url()).pathname).to.equal("/actions");
    }
  });

  test("Server component: throw redirect() in the page a server action's rerender() renders, and Back returns to it with the cached rsc() outputs", async () => {
    await showLoadCounts();
    const loaded = await readLoadCounts();
    await navigateToActions();
    await expectRedirectedHome(() => page.click('button:has-text("Save, then the page throws redirect()")'));
    await page.goBack();
    await autoRetry(async () => {
      expect(new URL(page.url()).pathname).to.equal("/actions");
    });
    await waitForHydration("Slow save");
    await page.goBack();
    await waitForHydration("Show server counts");
    await toggleLoadCounts();
    expect(await page.locator("[data-loading-component]").count()).to.equal(0);
    expect(await readLoadCounts()).to.deep.equal(loaded);
  });
}

function testStaticHostAction() {
  test("Server action: a static host's answer rejects the call with its status", async () => {
    await page.goto(getServerUrl() + "/actions");
    await waitForHydration("Slow save");
    await page.click('button:text-is("Save")');
    await autoRetry(async () => {
      expect(await page.textContent("[data-result]")).to.equal("Rejected: [vike-react-rsc] Server action failed: HTTP 404");
    });
  });
}

function testActionAbort() {
  test("Server action: a redirect to a javascript: URL rejects the call and runs nothing", async () => {
    await page.goto(getServerUrl() + "/actions");
    await waitForHydration("Slow save");
    await page.click('button:has-text("Redirect to a javascript: URL")');
    await autoRetry(async () => {
      expect(await page.textContent("[data-result]")).to.equal(
        "Rejected: [vike-react-rsc] The server redirected to javascript:void(window.__redirected=1), which isn't an http(s) URL"
      );
    });
    expect(await page.evaluate(() => "__redirected" in window)).to.equal(false);
  });

  test("Server action: throw render() shows that page, at the same URL", async () => {
    await page.goto(getServerUrl() + "/actions");
    await waitForHydration("Slow save");
    await page.click('button:has-text("Require a login")');
    await autoRetry(async () => {
      expect(await page.textContent("h1")).to.equal("Log in");
    });
    expect(new URL(page.url()).pathname).to.equal("/actions");
  });

  test("Server action: a cookie it sets before throw render() reaches that page's guard()", async () => {
    await page.goto(getServerUrl() + "/actions");
    await waitForHydration("Slow save");
    await page.click('button:has-text("Log in, then render the account")');
    await autoRetry(async () => {
      expect(await page.textContent("#account-user")).to.equal("Logged in as bob");
    });
    await page.context().clearCookies();
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
    await page.click('button:text-is("Save")');
    await autoRetry(async () => {
      expect(await page.evaluate(() => performance.timeOrigin)).to.not.equal(timeOrigin);
    });
    await waitForHydration("Slow save");
    await callUnknownId(unknownId);
    await page.click('button:text-is("Save")');
    await autoRetry(async () => {
      expect(await page.textContent("[data-result]")).to.equal("Rejected: [vike-react-rsc] Server action failed: HTTP 404");
    });
  });

  test("Server action: a form submitted before hydration with an id the server doesn't know loads its page again", async () => {
    const form = new FormData();
    form.append(`$ACTION_ID_/gone.ts#action${Date.now()}`, "x");
    const response = await submitForm("/actions", form);
    expect([response.status(), response.headers().location]).to.deep.equal([303, "/actions"]);
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
      await noJs.click('button:has-text("Count via formAction")');
      await noJs.waitForSelector("[data-submits]:has-text('Submitted 3 times')");
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

  test("Server action: a multipart POST that names no action reaches the page", async () => {
    for (const field of ["attachment", "$ACTION_KEY"]) {
      const form = new FormData();
      form.append(field, "x");
      expect((await submitForm("/actions", form)).status()).to.equal(200);
    }
  });

  test("Server action: an upload over rsc.bodySizeLimit from fetch() reaches the page, and the next requests work", async () => {
    const form = new FormData();
    form.append("attachment", new Blob([new Uint8Array(2 * 1024 * 1024)]));
    const response = await fetch(getServerUrl() + "/actions", { method: "POST", body: form });
    await response.text();
    expect(response.status).to.equal(200);
    // The first request after the upload takes a new connection; a later one reuses the upload's
    for (let i = 0; i < 3; i++) {
      const next = await fetch(getServerUrl() + "/");
      await next.text();
      expect(next.status).to.equal(200);
      await sleep(50);
    }
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

    // A form submitted before hydration
    await withoutScripts(async (noJs) => {
      await noJs.goto(getServerUrl() + "/actions");
      await noJs.setInputFiles('input[name="attachment"]', {
        name: "attachment.txt",
        mimeType: "text/plain",
        buffer: Buffer.alloc(2 * 1024 * 1024, "a"),
      });
      const [submitted] = await Promise.all([
        noJs.waitForResponse((response) => response.request().method() === "POST"),
        noJs.click('button:has-text("Count a submit")'),
      ]);
      expect(submitted.status()).to.equal(413);
    });
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

function testCspNonce(isStatic: boolean) {
  test("Every inline script carries the CSP nonce", async () => {
    const html = await fetchHtml("/csp");
    const nonce = /<script[^>]* nonce="([^"]+)"/.exec(html)?.[1];
    expect(nonce, "nonce missing from response").to.be.a("string");
    const inlineScripts = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>[^<]*/g)].map(([script]) => script);
    // React's own, for the streamed boundary, besides Vike's. A pre-rendered page has the boundary's content in place.
    if (!isStatic) expect(inlineScripts.some((script) => !/vike/i.test(script))).to.equal(true);
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
    const html = await fetchHtml("/");
    expect(html.slice(0, html.indexOf("</head>"))).to.include('<meta name="theme-color" content="#f9fafb"/>');
  });
}

function testOnAfterRenderHtml() {
  test("+onAfterRenderHtml gets pageContext.pageHtmlStream on a page with stream: true, pre-rendered too, as in vike-react", async () => {
    expect(await fetchHtml("/render-html")).to.include('<div id="root" data-root=""><!-- Streamed through +onAfterRenderHtml -->');
  });
}

function testHeadSettings(isStatic: boolean) {
  test("Head settings: the HTML has their tags and attributes, the defaults, and none for null", async () => {
    const html = await fetchHtml("/");
    const head = html.slice(0, html.indexOf("</head>"));
    expect(html).to.include('<html data-html="" lang="en">');
    expect(head).to.include('<title>Vike RSC demo</title><meta property="og:title" content="Vike RSC demo" />');
    expect(head).to.include(
      '<meta name="description" content="A demo of Vike with React Server Components" /><meta property="og:description" content="A demo of Vike with React Server Components" />'
    );
    expect(head).to.include('<link rel="icon" href="/vike.svg" />');
    expect(head.match(/<meta name="viewport"[^>]*>/g)).to.deep.equal(['<meta name="viewport" content="width=device-width,initial-scale=1">']);
    const positions = [
      "<!-- headHtmlBegin -->",
      "<title>",
      '<meta name="theme-color"',
      '<link rel="icon"',
      "<!-- headHtmlEnd -->",
      "</head>",
      '<body data-body=""',
      "<!-- bodyHtmlBegin -->",
      '<div id="root" data-root="">',
      "<!-- bodyHtmlEnd / -->",
      "</body>",
    ].map((tag) => html.indexOf(tag));
    expect(positions).to.not.include(-1);
    expect(positions).to.deep.equal([...positions].sort((a, b) => a - b));
    await page.goto(getServerUrl() + "/");
    expect(await page.getAttribute("body", "data-quoted")).to.equal('"><b>&amp;');
    expect(await page.locator("body > b").count()).to.equal(0);

    const set = await fetchHtml("/head-settings");
    expect(set).to.include('<html data-html="" lang="fr">');
    expect(set).to.include("<title>Head settings from +data</title>");
    expect(set).to.include('<meta name="description" content="Set by +description" />');
    expect(set).to.include('<meta property="og:image" content="/vike.svg"><meta name="twitter:card" content="summary_large_image">');
    expect(set).to.include('<meta name="viewport" content="width=1024">');

    const removed = await fetchHtml("/head-settings-null");
    expect(removed).to.include('<html data-html="">');
    expect(removed).to.not.match(/<title>|<meta name="(description|viewport)"|<meta property="og:/);
  });

  test("Head settings: a navigation applies the title, description and lang once its page shows", async () => {
    await page.goto(getServerUrl() + "/");
    await waitForHydration();
    // The heading on screen at each change of the title
    await page.evaluate(() => {
      const headings: string[] = [];
      Object.assign(window, { headingsAtTitleChange: headings });
      new MutationObserver(() => headings.push(document.querySelector("h1")!.textContent!)).observe(
        document.querySelector("title")!,
        { childList: true, characterData: true, subtree: true }
      );
    });
    const navigate = async (href: string, heading: string) => {
      await clickNewLink(href);
      await autoRetry(async () => expect(await page.textContent("h1")).to.equal(heading));
    };
    const description = () => page.getAttribute('meta[name="description"]', "content");

    // /head-settings' Page takes 500 ms, during which / stays on screen
    await navigate("/head-settings", "Head settings");
    await autoRetry(async () => expect(await page.title()).to.equal("Head settings from +data"));
    expect(await page.getAttribute("html", "lang")).to.equal("fr");
    expect(await description()).to.equal("Set by +description");
    expect(await page.getAttribute('meta[property="og:title"]', "content")).to.equal("Head settings from +data");

    await navigate("/head-settings-null", "Head settings removed");
    await autoRetry(async () => expect(await page.title()).to.equal(""));
    expect(await page.getAttribute("html", "lang")).to.equal("en");
    expect(await page.locator('meta[name="description"], meta[property^="og:"]').count()).to.equal(0);

    await navigate("/", "Vike React Server Components");
    await autoRetry(async () => expect(await page.title()).to.equal("Vike RSC demo"));
    expect(await description()).to.equal("A demo of Vike with React Server Components");
    expect(await page.locator("title").count()).to.equal(1);
    expect(await page.evaluate(() => (window as { headingsAtTitleChange?: string[] }).headingsAtTitleChange)).to.deep.equal([
      "Head settings",
      "Head settings removed",
      "Vike React Server Components",
    ]);
  });

  test("Head settings: a setting that throws in the browser reaches Vike, and the previous page stays on screen with its actions", async () => {
    await page.goto(getServerUrl() + "/");
    await waitForHydration();
    // Vike logs the errors it catches
    const logged = page.waitForEvent("console", (message) => message.type() === "error" && message.text().includes(HEAD_SETTING_ERROR));
    await clickNewLink("/head-settings-throw");
    await logged;
    expect(await page.textContent("h1")).to.equal("Vike React Server Components");
    expect(await page.title()).to.equal("Vike RSC demo");

    // A static host can't run actions
    if (isStatic) return;
    const action = page.waitForRequest((request) => !!request.headers()["x-rsc-action"]);
    await page.click('button:has-text("Increment")');
    expect(new URL((await action).url()).pathname).to.equal("/");
  });
}

function testHeadSettingsRerender() {
  test("Head settings: rerender() keeps a title the page set in the browser", async () => {
    // A navigation, so the page isn't the hydrated one, whose settings the HTML has
    await page.goto(getServerUrl() + "/");
    await waitForHydration();
    await page.click('a[href="/todos"]');
    await waitForHydration("Add Task");
    await page.evaluate(() => (document.title = "Set in the browser"));
    await page.fill('input[placeholder="What needs to be done?"]', "Head settings todo");
    await page.click('button:has-text("Add Task")');
    await autoRetry(async () => {
      expect(await page.textContent("body")).to.include("Head settings todo");
    });
    expect(await page.title()).to.equal("Set in the browser");
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
    expect(await getColor(noJsPage, "[data-styled-client]")).to.equal("rgb(0, 128, 0)");
    // The CSS of a client component it imports
    expect(await getColor(noJsPage, "[data-nested-client]")).to.equal("rgb(0, 0, 128)");
    await context.close();

    // Rendered after React's shell, in a Suspense boundary that React's inline scripts reveal
    await withoutScripts(async (noJs) => {
      await noJs.goto(getServerUrl() + "/client-css-streamed");
      await noJs.waitForSelector("[data-styled-client]");
      expect(await getColor(noJs, "[data-styled-client]")).to.equal("rgb(0, 128, 0)");
      expect(await getColor(noJs, "[data-nested-client]")).to.equal("rgb(0, 0, 128)");
    });
  });
}

const getColor = (somePage: typeof page, selector: string) =>
  somePage.$eval(selector, (element) => getComputedStyle(element).color);

function testClientCssLinkRemoved() {
  test("In dev, a client component's CSS link goes once Vite has injected the CSS", async () => {
    // Else, removing the CSS import wouldn't remove its styles until a reload
    await page.goto(getServerUrl() + "/client-css");
    await autoRetry(async () => {
      expect(await page.$$('link[href*="StyledClient.css"]')).to.have.length(0);
    });
    expect(await getColor(page, "[data-styled-client]")).to.equal("rgb(0, 128, 0)");
  });
}

function testMisuse() {
  test("getPageContext(), rerender() and cookies.set() throw where they can't work", async () => {
    const html = await fetchHtml("/misuse");
    const error = (call: string) => new RegExp(`data-misuse="${call}">([^<]*)<`).exec(html)?.[1];
    expect(error("getPageContext")).to.equal(
      "[vike-react-rsc] getPageContext() needs a server component render, and none runs here"
    );
    expect(error("rerender")).to.equal("[vike-react-rsc] rerender() needs a running server action, and none runs here");
    // The same message from data(), which runs outside the rsc env
    expect(error("data:rerender")).to.equal(error("rerender"));
    // A server component inside <Suspense> renders after the headers are sent; data() runs before
    expect(error("setCookie")).to.equal(
      "[vike-react-rsc] pageContext.cookies.set() and delete() can&#x27;t run while server components render: call them in a server action, or in a hook such as guard() or data()"
    );
    expect(error("data:setCookie")).to.equal("No error");
    // has() and getAll() see it in the same request
    expect(error("data:cookieSeen")).to.equal("true 1");
  });
}

function testServerLoading() {
  test('A +Loading that starts with "use server component" reaches the browser only as a stub', async () => {
    await page.goto(getServerUrl() + "/");
    await waitForHydration();
    await clickNewLink("/server-loading");
    await autoRetry(async () => {
      expect(await page.textContent("h1")).to.include("A page whose +Loading is a server component");
    });
    const scripts = await page.evaluate(() =>
      performance.getEntriesByType("resource").map((entry) => entry.name).filter((url) => /\.[cm]?[jt]sx?$/.test(new URL(url).pathname))
    );
    for (const url of scripts) expect(await (await fetch(url)).text(), url).to.not.include("read on the server");
  });
}

function testSsrFalse(isStatic: boolean) {
  test("ssr: false: the first load's HTML has no page, and the browser renders it from its Flight", async () => {
    // Pre-rendered too: the HTML with an empty root, and the Flight
    expect(await fetchHtml("/spa")).to.include('<div id="root" data-root=""></div>');
    await page.goto(getServerUrl() + "/spa");
    // SpaControls reads window while it renders
    await page.waitForSelector("#spa-rerender");
    expect(await page.textContent("#spa-rendered-on")).to.equal("Rendered on the server");
    // A static host has no server to run the action
    if (!isStatic) {
      const renders = Number(await page.textContent("#spa-renders"));
      await page.click("#spa-rerender");
      await autoRetry(async () => {
        expect(Number(await page.textContent("#spa-renders"))).to.be.greaterThan(renders);
      });
    }
    await page.goto(getServerUrl() + "/");
    await waitForHydration();
    await clickNewLink("/spa");
    await page.waitForSelector("#spa-rerender");
    expect(await page.textContent("#spa-rendered-on")).to.equal("Rendered on the server");
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

  test("A client leaving a page that renders whole, which sends nothing before it has rendered, stops the render of its server and client components, also while its +onBeforeRenderHtml or +onAfterRenderHtml runs, and isn't logged as an error", async () => {
    // A server component waits in /slow-whole, a client component waits for its own data in /slow-client and in
    // /slow-required-disabled (stream: false where streaming is required), and the client leaves /slow-before-hook while
    // its +onBeforeRenderHtml runs, and the streamed /slow-after-hook while its +onAfterRenderHtml runs
    for (const [path, key] of [
      ["/slow-whole", "slow"],
      ["/slow-client", "slow-client"],
      ["/slow-required-disabled", "slow-client"],
      ["/slow-before-hook", "slow"],
      ["/slow-after-hook", "slow-client"],
    ] as const) {
      const before = await getServerCount(key);
      await fetchHtml(path);
      expect(await getServerCount(key)).to.equal(before + 1);

      // Leaving once the render has started, before the Suspense boundary resolves
      const controller = new AbortController();
      const response = fetch(getServerUrl() + path, { signal: controller.signal }).catch(() => {});
      await sleep(500);
      controller.abort();
      await response;
      await sleep(2500);
      expect(await getServerCount(key), path).to.equal(before + 1);
    }
  });

  test("An HTML hook that throws stops the page's render, of its server and client components", async () => {
    // A server component waits in /slow-hook-throws, a client component waits for its own data in the streamed
    // /slow-after-hook-throws, and in /slow-after-hook-pipes, whose hook has piped the HTML
    for (const [path, key, hook] of [
      ["/slow-hook-throws", "slow", "+onBeforeRenderHtml"],
      ["/slow-after-hook-throws", "slow-client", "+onAfterRenderHtml"],
      ["/slow-after-hook-pipes", "slow-client", "+onAfterRenderHtml"],
    ] as const) {
      const before = await getServerCount(key);
      expect((await fetch(getServerUrl() + path)).status, path).to.equal(500);
      expectLog(`Thrown by ${path}'s ${hook}`, { filter: ({ logSource }) => logSource === "stderr" });
      await sleep(2500);
      expect(await getServerCount(key), path).to.equal(before);
    }
  });

  test("A render that times out calls renderToStreamOptions.onTimeout once", async () => {
    const before = await getServerCount("slow-required-timeout");
    for (let i = 1; i <= 10; i++) {
      expect(await fetchHtml("/slow-required-timeout")).to.include("<p>Loading</p>").and.not.include("<p>Resolved</p>");
      expect(await getServerCount("slow-required-timeout")).to.equal(before + i);
    }
  });

  test("+react's renderToStreamOptions.signal stops the render, as in vike-react", async () => {
    expect(await fetchHtml("/slow-user-signal")).to.include("<p>Loading</p>").and.not.include("<p>Resolved</p>");
  });
}

function testGonePassToClientValue() {
  test("After rerender(), a passToClient value the server no longer sets is gone, as after a navigation", async () => {
    await page.context().addCookies([{ name: "visitor", value: "alice", url: getServerUrl() }]);
    await page.goto(getServerUrl() + "/client");
    await waitForHydration("Render again");
    expect(await page.textContent("[data-visitor]")).to.equal("alice");
    await page.context().clearCookies({ name: "visitor" });
    await page.click('button:has-text("Render again")');
    await autoRetry(async () => {
      expect(await page.textContent("[data-visitor]")).to.equal("none");
    });
  });
}

function testConcurrentRerender() {
  test("Server action: two rerender() calls in flight at once on one page both apply", async () => {
    await page.goto(getServerUrl() + "/unserializable");
    await waitForHydration("Render again");
    const readRender = async () => Number(await page.textContent("[data-render]"));
    const before = await readRender();
    // The second click starts its action before the first one's answer arrives
    await page.dblclick('button:has-text("Render again")');
    await autoRetry(async () => {
      expect(await readRender()).to.equal(before + 2);
    });
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

function testActionSkipsData() {
  test("Server action: without rerender(), the page's data() doesn't run", async () => {
    await page.goto(getServerUrl() + "/actions");
    await waitForHydration("Slow save");
    const before = await getServerCount("data /actions");
    await page.click('button:text-is("Save")');
    await autoRetry(async () => {
      expect(await page.textContent("[data-result]")).to.equal("Returned: saved");
    });
    expect(await getServerCount("data /actions")).to.equal(before);
  });
}

const actionNoPageError =
  "[vike-react-rsc] getPageContext() needs a page, and a server action or a component passed to rsc() has none: call getRequestContext() from vike-react-rsc/server";
const usePageContextInActionError =
  "[vike-react-rsc] usePageContext() needs a page, and a server action or a component passed to rsc() has none: call getRequestContext() from vike-react-rsc/server";
const returnedNoPageError =
  "[vike-react-rsc] getPageContext() needs a page, and the server components a server action returns without rerender() have none: load them with rsc(), or call getRequestContext() from vike-react-rsc/server";

function testActionRequestContext() {
  test("Server component: getRequestContext() has what every +middleware adds", async () => {
    await page.goto(getServerUrl() + "/actions");
    expect(await page.textContent("[data-page-request-context]")).to.equal("GET");
  });
  test("Server action: getRequestContext() has what every +middleware adds, and getPageContext() and usePageContext() throw", async () => {
    await page.goto(getServerUrl() + "/actions");
    await waitForHydration("Slow save");
    await page.click('button:has-text("Read the request context")');
    await autoRetry(async () => {
      expect(await page.textContent("[data-result]")).to.equal(`Returned: POST | ${actionNoPageError} | ${usePageContextInActionError}`);
    });
  });
  test("Server action: getPageContext() throws in the server components it returns without rerender()", async () => {
    await page.goto(getServerUrl() + "/actions");
    await waitForHydration("Slow save");
    await page.click('button:has-text("Return a server component that calls getPageContext()")');
    await autoRetry(async () => {
      expect(await page.textContent("[data-returned-page-context]")).to.equal(returnedNoPageError);
    });
  });
  test("rsc(): getPageContext() throws in the component passed to it", async () => {
    await page.goto(getServerUrl() + "/actions");
    await waitForHydration("Slow save");
    await page.click('button:has-text("Load a server component that calls getPageContext()")');
    await autoRetry(async () => {
      expect(await page.textContent("[data-rsc-page-context]")).to.equal(actionNoPageError);
    });
  });
}

function testActionValueSurvivesHookError() {
  test("Server action: without rerender(), its value survives an error in +onCreatePageContext", async () => {
    await page.goto(getServerUrl() + "/actions");
    await waitForHydration("Slow save");
    await page.context().addCookies([{ name: "failOnCreatePageContext", value: "1", url: getServerUrl() }]);
    await page.click('button:text-is("Save")');
    await autoRetry(async () => {
      expect(await page.textContent("[data-result]")).to.equal("Returned: saved");
    });
    await page.context().clearCookies({ name: "failOnCreatePageContext" });
  });
  for (const abort of ["render", "redirect"]) {
    test(`Server action: without rerender(), its value survives +onCreatePageContext throwing ${abort}() while it runs`, async () => {
      await page.goto(getServerUrl() + "/actions");
      await waitForHydration("Slow save");
      await page.context().addCookies([{ name: "abortOnCreatePageContext", value: `${abort}-${Math.random()}`, url: getServerUrl() }]);
      await page.click('button:has-text("Save slowly, without rerender()")');
      await autoRetry(async () => {
        expect(await page.textContent("[data-result]")).to.equal("Returned: saved");
      });
      expect(new URL(page.url()).pathname).to.equal("/actions");
      await page.context().clearCookies({ name: "abortOnCreatePageContext" });
    });
  }
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
  await clickNewLink("/actions");
  await waitForHydration("Slow save");
}

// The console errors the page logs until stop() is called
function trackConsoleErrors() {
  const errors: string[] = [];
  const onConsole = (message: { type(): string; text(): string }) => {
    if (message.type() === "error") errors.push(message.text());
  };
  page.on("console", onConsole);
  return {
    stop: () => {
      page.off("console", onConsole);
      return errors;
    },
  };
}

// Clicks a link appended to the page, so it works where no page links to href. Vike's client router handles any link, so this is a client navigation.
async function clickNewLink(href: string) {
  await page.evaluate(
    (href) => document.body.append(Object.assign(document.createElement("a"), { href, textContent: href })),
    href
  );
  await page.locator(`a[href="${href}"]`).last().click();
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

  test("rsc(): a server component that throws is answered with its status, without the error page", async () => {
    await page.goto(getServerUrl() + "/actions");
    await waitForHydration("Slow save");
    const sent = page.waitForRequest((request) => !!request.headers()["x-rsc-action"]);
    await page.click('button:has-text("Load a failing server component")');
    const request = await sent;
    // The same call again, to read the answer the browser drops
    const response = await fetch(request.url(), { method: "POST", headers: request.headers(), body: request.postData() });
    expect(response.status).to.equal(500);
    expect(await response.text()).to.not.include("Something went wrong");
  });
}

function testErrorPageInBrowser() {
  test("The error page after an error in the browser: the console says why it can't render there, and the page stays", async () => {
    await page.goto(getServerUrl() + "/");
    await waitForHydration();
    await clickNewLink("/browser-error");
    await autoRetry(async () => {
      expectLog(
        `[vike-react-rsc] The page /src/pages/_error ${ERROR_PAGE_IN_BROWSER_ERROR}, but components: 'server' makes it a server component, which renders only on the server`,
        { filter: ({ logSource }) => logSource === "Browser Error" }
      );
    });
    expect(await page.textContent("h1")).to.include("Vike React Server Components");
  });
}

function testServerComponentThrows() {
  test("A client navigation to a server component that throws: the console says why the error page can't render, and the next navigation shows its page", async () => {
    await page.goto(getServerUrl() + "/");
    await waitForHydration();
    await clickNewLink("/throws");
    // components: 'server' makes the error page a server component, which can't render in the browser
    await autoRetry(async () => {
      expectLog(
        `[vike-react-rsc] The page /src/pages/_error ${ERROR_PAGE_IN_BROWSER_ERROR}, but components: 'server' makes it a server component, which renders only on the server`,
        { filter: ({ logSource }) => logSource === "Browser Error" }
      );
    });
    await clickNewLink("/client");
    await autoRetry(async () => {
      expect(await page.textContent("[data-url-pathname]")).to.equal("/client");
    });
  });
}

function testUnserializableData(isStatic: boolean) {
  test("A page whose data holds a function updates on navigation and after rerender()", async () => {
    // Pre-rendered too, without a query
    expect(await fetchHtml("/unserializable")).to.include('href="/unserializable?page=2"');
    // A static host has no server: only the pre-rendered page exists
    if (isStatic) return;
    await page.goto(getServerUrl() + "/unserializable?page=1");
    await waitForHydration("Render again");
    for (const next of ["2", "3"]) {
      await page.click('a:has-text("Next page")');
      await autoRetry(async () => {
        expect(await page.textContent("[data-page]")).to.equal(next);
      });
    }
    const readRender = async () => Number(await page.textContent("[data-render]"));
    for (let i = 0; i < 2; i++) {
      const before = await readRender();
      await page.click('button:has-text("Render again")');
      await autoRetry(async () => {
        expect(await readRender()).to.be.greaterThan(before);
      });
    }
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
    await clickNewLink("/client");
    // /client's Page is a client component: its module is held
    await autoRetry(() => expect(isHeld).to.equal(true));
    await sleep(500);
    expect(await page.locator("[data-loading-layout]").count()).to.equal(0);
    expect(await page.textContent("h1")).to.include("Vike React Server Components");
    release();
    await autoRetry(async () => {
      expect(await page.textContent("[data-url-pathname]")).to.equal("/client");
    });
    // The navigation ends once React shows the page
    expect(await page.evaluate(() => (window as { shownAtTransitionEnd?: string | null }).shownAtTransitionEnd)).to.equal("/client");
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

function testServerCssHmr() {
  test("Dev: editing the CSS a server component imports updates the page without a reload", async () => {
    await page.goto(getServerUrl() + "/");
    await waitForHydration();
    const timeOrigin = await page.evaluate(() => performance.timeOrigin);
    const backgroundColor = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    // +Layout.tsx imports it
    editFile("./src/styles/global.css", (source) =>
      source.replace("background-color: #f9fafb;", "background-color: rgb(1, 2, 3);")
    );
    await autoRetry(async () => {
      expect(await backgroundColor()).to.equal("rgb(1, 2, 3)");
    });
    editFileRevert();
    await autoRetry(async () => {
      expect(await backgroundColor()).to.equal("rgb(249, 250, 251)");
    });
    expect(await page.evaluate(() => performance.timeOrigin)).to.equal(timeOrigin);
  });
}
