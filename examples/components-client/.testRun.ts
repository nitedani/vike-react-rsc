export { testRun };
import { execFile } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { test, expect, run, page, autoRetry, getServerUrl, editFile, editFileRevert, expectLog, fetch, fetchHtml, sleep } from "@brillout/test-e2e";

// What the errors the tests below cause say
// testServerComponentImports(): in dev, the error on the server, then the browser's for the page it can't load
const SERVER_COMPONENT_IN_BROWSER_ERROR = 'starts with "use server component", but the browser loads it';
// Thrown by /throws, then logged by React in the browser, which Vite forwards to stderr in dev
const THROWS_ERROR = "A client component failed on demand";
// Thrown by /hydration-error in the browser only, so its hydration fails
const HYDRATION_ERROR = "A page failed to hydrate on demand";
const SERVER_FUNCTION_COMPONENT_ERROR = 'starts with "use server", which makes its exports server functions';
const CLIENT_HOOK_ERROR = "is for client components";
const CLIENT_API_ERROR = "which runs only in the browser, but runs on the server";
const EXPORT_ALL_ERROR = "doesn't name its Page";
// Logged by /use-config-server
const USE_CONFIG_IN_SERVER_COMPONENT_ERROR =
  'useConfig() in a server component only sets the HTML <head> of a full page load. Render <Config title={…} /> (vike-react-rsc/Config) instead, or start this file with "use client".';

function testRun(cmd: `pnpm run ${"dev" | "preview"}`) {
  const isDev = cmd === "pnpm run dev";

  run(cmd, {
    serverIsReadyMessage: (log) => log.includes("Local:") || log.includes("ready in"),
    // The preview command builds before it serves
    additionalTimeout: isDev ? 0 : 60000,
    tolerateError: ({ logSource, logText }) =>
      // testClientHooks(), and the dev server also sees the edits the builds make
      (logSource === "stderr" &&
        (logText.includes(CLIENT_HOOK_ERROR) ||
          logText.includes(CLIENT_API_ERROR) ||
          logText.includes(EXPORT_ALL_ERROR) ||
          logText.includes("useState is not a function") ||
          logText.includes("createContext is not a function") ||
          logText.includes("Class extends value undefined") ||
          logText.includes("HTTP response ← /helper 500"))) ||
      logText.includes(SERVER_COMPONENT_IN_BROWSER_ERROR) ||
      (logSource === "Browser Error" && logText.includes("status of 500")) ||
      // Vite forwards these from the browser to stderr too
      logText.includes("Failed to fetch dynamically imported module") ||
      logText.includes(THROWS_ERROR) ||
      logText.includes(HYDRATION_ERROR) ||
      // Vike takes the alias of /aliased-layout for an npm package to pre-bundle
      logText.includes("Cannot optimize dependency: @app/components/AliasedLayout") ||
      // The export * of /export-all also re-exports a function
      logText.includes("/pages/export-all/+Page.tsx unexpected export { shout }"),
  });

  testClientComponents();
  testServerComponents();
  testLoading();
  testVikeReactRendering();
  testVikeReactImports();
  testFormBeforeHydration();
  testRestoredFormState();
  // The dev server serves the sources, so a build can run beside it
  if (isDev) testServerFunctionComponents();
  if (isDev) testComponentsConfig();
  if (isDev) testClientHooks();
  if (isDev) testMarkerHmr();
  if (isDev) testServerComponentHmr();
  if (isDev) testClientComponentHmr();
  if (isDev) testServerComponentImports();
}

function testClientComponents() {
  test("components: 'client': an unmarked page and layout are client components", async () => {
    await page.goto(getServerUrl() + "/");
    await waitForHydration("#counter");
    await page.click("#counter");
    await page.click("#layout-counter");
    await autoRetry(async () => {
      expect(await page.textContent("#counter")).to.equal("Counter 1");
      expect(await page.textContent("#layout-counter")).to.equal("Layout 1");
    });
  });

  test("components: 'client': an unmarked +Page.js or +Page.mdx is a client component, in a server layout too, as in vike-react", async () => {
    for (const [pathname, counter, clicked] of [
      ["/admin/js-page", "#js-counter", "JS counter 1"],
      ["/admin/mdx-page", "#mdx-counter", "MDX counter 1"],
    ]) {
      await page.goto(getServerUrl() + pathname);
      expect(await page.textContent("#admin-layout")).to.equal("A server layout, rendered on the server");
      await clickCounter(counter, clicked);
    }
  });
}

function testServerComponents() {
  test('components: \'client\': "use server component" marks a server component, after "use strict" too, and in a + file exporting it as Page', async () => {
    await page.goto(getServerUrl() + "/server");
    expect(await page.textContent("#rendered-on")).to.equal("Rendered on the server");
    // The component it renders starts with "use client"
    await clickCounter("#counter", "Counter 1");

    await page.goto(getServerUrl() + "/strict");
    await waitForHydration("#layout-counter");
    expect(await page.textContent("#rendered-on")).to.equal('Rendered on the server, marked after "use strict"');

    await page.goto(getServerUrl() + "/named-export");
    await waitForHydration("#layout-counter");
    expect(await page.textContent("#rendered-on")).to.equal("Rendered on the server, exported as Page");
  });

  test("components: 'client': a server + file that exports its component and also has an export * or export type * renders on the server", async () => {
    await page.goto(getServerUrl() + "/export-all");
    await waitForHydration("#layout-counter");
    expect(await page.textContent("#rendered-on")).to.equal("Rendered on the server, next to an export *");

    await page.goto(getServerUrl() + "/export-type-all");
    await waitForHydration("#layout-counter");
    expect(await page.textContent("#rendered-on")).to.equal("Rendered on the server, next to an export type *");
  });

  test("components: 'client': a file without a directive that imports a server component, through another such file, is a server component, and the client component it renders hydrates", async () => {
    await page.goto(getServerUrl() + "/ancestor");
    await waitForHydration("#counter");
    expect(await page.textContent("#rendered-on")).to.equal("Rendered on the server");
    expect(await page.innerHTML("#markdown")).to.equal("Rendered by a <b>server component</b>, through a file without a directive");
    await page.click("#counter");
    await autoRetry(async () => {
      expect(await page.textContent("#counter")).to.equal("Counter 1");
    });
  });

  test("components: 'client': a file without a directive that imports a package's server component is a server component", async () => {
    const html = await fetchHtml("/package-import");
    expect(html).to.include("rscPayload");
    expect(html).to.include("A server component of a package, rendered on the server");
    // The browser renders it from the Flight, not as an async client component
    await page.goto(getServerUrl() + "/package-import");
    await waitForHydration("#layout-counter");
    expect(await page.textContent("#package-badge")).to.equal("A server component of a package, rendered on the server");
  });

  test("components: 'client': a file without a directive that imports a server component through an import only a plugin resolves is a server component", async () => {
    const html = await fetchHtml("/plugin-import");
    expect(html).to.include("rscPayload");
    expect(html).to.include("Rendered by a <b>server component</b>, through an import only a plugin resolves");
  });

  test("components: 'client': a file without a directive that imports only a type from a server component, without import type, stays a client component", async () => {
    await page.goto(getServerUrl() + "/type-import");
    await clickCounter("#type-import-counter", "Clicked 1 times");
  });

  test("components: 'client': a file without a directive that imports a server component's file with ?raw or ?url stays a client component", async () => {
    await page.goto(getServerUrl() + "/raw-import");
    expect(await page.textContent("#raw-import-source")).to.equal('"use server component";');
    await clickCounter("#raw-import-counter", "Clicked 1 times");
  });

  test("components: 'client': a server component calls a function from a component file, on the server", async () => {
    expect(await fetchHtml("/helper")).to.include("A FUNCTION OF A COMPONENT FILE, CALLED ON THE SERVER!");
  });
}

function testVikeReactRendering() {
  test("components: 'client': a page without server components renders as in vike-react, without a Flight", async () => {
    expect(await fetchHtml("/")).to.not.include("rscPayload");
    expect(await fetchHtml("/server")).to.include("rscPayload");
  });

  test("components: 'client': the root Layout keeps its state between client and server pages, hydrated on a server page, with and without a +Loading, and on Back", async () => {
    await page.goto(getServerUrl() + "/server");
    await waitForHydration("#layout-counter");
    await page.click("#layout-counter");
    const layoutCounter = async () => expect(await page.textContent("#layout-counter")).to.equal("Layout 1");
    await autoRetry(layoutCounter);
    await page.click('a[href="/"]');
    await page.waitForSelector("h1:text-is('A client page')");
    await layoutCounter();
    await page.click('a[href="/loading-component"]');
    await page.waitForSelector("text=A server page that waits for its data");
    await layoutCounter();
    await page.click('a[href="/server"]');
    await page.waitForSelector("text=Rendered on the server");
    await layoutCounter();
    await page.click('a[href="/admin"]');
    await page.waitForSelector("text=A server layout, rendered on the server");
    await layoutCounter();
    await page.click('a[href="/"]');
    await page.waitForSelector("h1:text-is('A client page')");
    await layoutCounter();
    await page.goBack();
    await page.waitForSelector("text=A server layout, rendered on the server");
    await layoutCounter();
  });

  test('components: \'client\': a "use client" Layout that a +config file sets by an import renders on a client and a server page, and keeps its state between them', async () => {
    await page.goto(getServerUrl() + "/imported-layout/client");
    await clickCounter("#imported-layout-counter", "Imported layout 1");
    await page.click('a[href="/imported-layout/server"]');
    await page.waitForSelector("text=A server page in an imported layout");
    expect(await page.textContent("#imported-layout-counter")).to.equal("Imported layout 1");
  });

  test("components: 'client': a Layout without a directive that a +config file sets by an import is a client component, on a client page, a server page and with ssr: false, through a path alias only Vite knows or from a package with a react-server export or an import and a require file too", async () => {
    for (const [pathname, counter, clicked] of [
      ["/vike-react-layout", "#vike-react-layout-counter", "vike-react layout 1"],
      ["/vike-react-layout/server", "#vike-react-layout-counter", "vike-react layout 1"],
      ["/vike-react-layout/spa", "#vike-react-layout-counter", "vike-react layout 1"],
      ["/aliased-layout", "#aliased-layout-counter", "Aliased layout 1"],
      ["/react-server-layout", "#npm-layout-counter", "npm layout 1"],
      ["/dual-layout", "#npm-dual-layout-counter", "npm dual layout 1"],
    ]) {
      await page.goto(getServerUrl() + pathname);
      await clickCounter(counter, clicked);
    }
  });

  test('components: \'client\': a "use server component" Layout that a +config file sets by a named import renders on the server, around a client page, also where the default export of its file is the Wrapper', async () => {
    for (const pathname of ["/imported-server-layout", "/imported-server-layout/wrapper"]) {
      await page.goto(getServerUrl() + pathname);
      expect(await page.textContent("#imported-server-layout")).to.equal("An imported server layout, rendered on the server");
      if (pathname.endsWith("/wrapper")) {
        expect(await page.textContent("#imported-server-wrapper")).to.equal("An imported server wrapper, rendered on the server");
      }
      await clickCounter("#counter", "Counter 1");
    }
  });

  test("components: 'client': +onAfterRenderClient runs once the page shows, after hydration and after a client navigation, as in vike-react", async () => {
    const shown = { isHydration: false, shown: "A page with +onAfterRenderClient" };
    await page.goto(getServerUrl() + "/after-render");
    await autoRetry(async () => {
      expect(await page.evaluate(() => (window as { afterRenders?: unknown[] }).afterRenders)).to.deep.equal([{ ...shown, isHydration: true }]);
    });
    await clickLink("/");
    await page.waitForSelector("h1:text-is('A client page')");
    await clickLink("/after-render");
    await autoRetry(async () => {
      expect(await page.evaluate(() => (window as { afterRenders?: unknown[] }).afterRenders)).to.deep.equal([{ ...shown, isHydration: true }, shown]);
    });
  });

  test('components: \'client\': a "use server component" Layout from a package renders its react-server file on the server, around a server page and a client page', async () => {
    for (const pathname of ["/react-server-layout-marked/server", "/react-server-layout-marked/client"]) {
      await page.goto(getServerUrl() + pathname);
      expect(await page.textContent("#npm-server-layout")).to.equal("The react-server file of a server layout");
    }
    await clickCounter("#counter", "Counter 1");
  });

  test("components: 'client': a Layout from a package whose browser file reads window as it loads renders its Node file in the HTML and its browser file in the browser, around a server page", async () => {
    await page.goto(getServerUrl() + "/browser-layout");
    await page.waitForSelector("h1:text-is('A server page in an npm layout with a browser file')");
    await clickCounter("#npm-browser-layout-counter", "npm browser layout 1");
    expect(await page.evaluate(() => (window as { npmBrowserLayoutFile?: string }).npmBrowserLayoutFile)).to.equal("BrowserLayout.browser.js");
  });

  test('components: \'client\': a "use server component" Layout from a package with a browser file renders its default file on the server, which imports server-only', async () => {
    await page.goto(getServerUrl() + "/browser-server-layout");
    expect(await page.textContent("#npm-browser-server-layout")).to.equal("The default file of a server layout with a browser file");
    await clickCounter("#counter", "Counter 1");
  });

  test("components: 'client': +onBeforeRenderHtml runs before +Head renders to HTML, as in vike-react", async () => {
    expect(await fetchHtml("/render-html")).to.include('<meta name="store-greeting" content="A store +onBeforeRenderHtml created"/>');
  });

  test("components: 'client': +onBeforeRenderHtml gets pageContext.page and can replace it, e.g. to wrap it, as in vike-react", async () => {
    expect(await fetchHtml("/wrap-page")).to.match(/<section id="wrapper">.*<p id="wrapped-child">.*<\/section>/s);
  });

  test("components: 'client': on a full load, server components get the pageContext a client navigation gives them: no value the HTML hooks assign on pageContext reaches them, and their writes stay theirs", async () => {
    const store = "A store a server component created";
    for (const [pathname, expected] of [
      ["/render-html", { "#server-store": store, "#same-store": "true", "#locale": "Locale en", "#components": "Components undefined", "#has-user": "false", "#deferred-store": store, "#deferred-write": "Written by a server component", "#deferred-getter": "Written by a server component" }],
      ["/render-html/spa", { "#spa-store": store }],
    ] as const) {
      const expectServerComponents = async () => {
        for (const [selector, text] of Object.entries(expected)) {
          await page.waitForSelector(selector, { state: "attached" });
          expect(await page.textContent(selector), `${pathname} ${selector}`).to.equal(text);
        }
      };
      await page.goto(getServerUrl() + pathname);
      await expectServerComponents();
      await waitForHydration("#layout-counter");
      await clickLink("/");
      await page.waitForSelector("h1:text-is('A client page')");
      await clickLink(pathname);
      await expectServerComponents();
    }
  });

  test("components: 'client': +onAfterRenderHtml runs once the page rendered to HTML, with pageContext.pageHtmlString, every Suspense boundary resolved, on a page whose +stream neither enables nor requires streaming, else pageHtmlStream, and the HTML it sets is sent, as in vike-react", async () => {
    expect(await fetchHtml("/render-html")).to.include('<div id="root"><!-- Streamed through +onAfterRenderHtml -->');
    expect(await fetchHtml("/stream-off")).to.include("<!-- Rendered to a string by +onAfterRenderHtml --></div>");
    expect(await fetchHtml("/minify-html")).to.include('<p id="minified">Several spaces</p>');
    const minified = await fetchHtml("/minify-html-default");
    expect(minified).to.include('<p id="minified">Several spaces</p>');
    expect(minified).to.not.include("<p>Waiting for the delay</p>");
  });

  test("components: 'client': stream: { require: true, enable: false } sends the HTML at once, every Suspense boundary resolved, as in vike-react", async () => {
    const html = await fetchHtml("/stream-off");
    expect(html).to.include('<p id="delayed">Rendered after a delay</p>');
    expect(html).to.not.include("<p>Waiting for the delay</p>");
  });

  test("components: 'client': a page without +stream sends the HTML at once, every Suspense boundary resolved, as in vike-react", async () => {
    const reader = (await fetch(getServerUrl() + "/stream-default")).body!.getReader();
    const firstChunk = new TextDecoder().decode((await reader.read()).value);
    await reader.cancel();
    expect(firstChunk).to.include('<p id="delayed">Rendered after a delay</p>');
    expect(firstChunk).to.not.include("<p>Waiting for the delay</p>");
  });

  test("components: 'client': a stream: false page sends its HTML before its Flight ends, then the Flight's rows the HTML doesn't wait for", async () => {
    const response = await fetch(getServerUrl() + "/stream-off-promise");
    // With a content-length, Vike would have waited for the promise's row
    expect(response.headers.get("transfer-encoding")).to.equal("chunked");
    expect(await response.text()).to.match(/Show the answer.*Answered after a delay/s);
  });

  test("components: 'client': +react sets the options of a stream: true page's render and of hydrateRoot(), as in vike-react", async () => {
    const response = await fetch(getServerUrl() + "/react-options");
    expect(response.status).to.equal(200);
    const id = /<p id="use-id">([^<]*)<\/p>/.exec(await response.text())?.[1];
    expect(id).to.include("vrr-");
    await page.goto(getServerUrl() + "/react-options");
    await waitForHydration("#use-id");
    expect(await page.textContent("#use-id")).to.equal(id);
  });

  test("components: 'client': a +react onCaughtError replaces the logging of what an error boundary catches, as in vike-react", async () => {
    await page.goto(getServerUrl() + "/caught-error");
    await waitForHydration("#fail");
    await page.click("#fail");
    await page.waitForSelector("#caught");
    // Nothing is logged: test-e2e fails a test on a browser error it doesn't tolerate
    await autoRetry(async () => {
      expect(await page.getAttribute("body", "data-reported")).to.equal("Error: A client component failed on a click");
    });
  });

  test("components: 'client': +react's renderToStreamOptions don't apply to a page without +stream, which hydrates, as in vike-react", async () => {
    const id = /<p id="use-id">([^<]*)<\/p>/.exec(await fetchHtml("/stream-only-options"))?.[1];
    expect(id).to.not.include("vrr-stream-");
    await page.goto(getServerUrl() + "/stream-only-options");
    await waitForHydration("#use-id");
    expect(await page.textContent("#use-id")).to.equal(id);
  });

  test("components: 'client': +react's renderToStringOptions set the options of a stream: false page's render, as in vike-react", async () => {
    const id = /<p id="use-id">([^<]*)<\/p>/.exec(await fetchHtml("/render-to-string-options"))?.[1];
    expect(id).to.include("vrr-string-");
    await page.goto(getServerUrl() + "/render-to-string-options");
    await waitForHydration("#use-id");
    expect(await page.textContent("#use-id")).to.equal(id);
  });

  test("components: 'client': ssr: false renders the page in the browser only, after +onBeforeRenderClient", async () => {
    expect(await fetchHtml("/spa")).to.not.include("Rendered in the browser");
    await page.goto(getServerUrl() + "/spa");
    await page.waitForSelector("text=Rendered in the browser, after onBeforeRenderClient() for /spa");
  });

  test("components: 'client': a client navigation to a page that throws shows the error page, as vike-react does", async () => {
    await page.goto(getServerUrl() + "/");
    await waitForHydration("#counter");
    await clickLink("/throws");
    await autoRetry(async () => {
      expect(await page.textContent("#error-page")).to.equal("Something went wrong");
    });
    expect(new URL(page.url()).pathname).to.equal("/throws");
  });

  test("components: 'client': after a page's hydration throws, client navigation shows each next page, as vike-react does", async () => {
    await page.goto(getServerUrl() + "/hydration-error");
    await autoRetry(async () => {
      expectLog(HYDRATION_ERROR, { filter: ({ logSource }) => logSource === "Browser Error" });
    });
    await clickLink("/admin");
    await page.waitForSelector("h1:text-is('A client page in a server layout')");
    await clickLink("/");
    await page.waitForSelector("h1:text-is('A client page')");
  });

  test("components: 'client': a form action that awaits navigate() shows the page it navigates to", async () => {
    await page.goto(getServerUrl() + "/form");
    await waitForHydration("#layout-counter");
    await page.click('button:has-text("Go home from a form action")');
    await page.waitForSelector("h1:text-is('A client page')");
  });

  test("components: 'client': ssr: false on a page with a server component: the browser renders it from its Flight", async () => {
    expect(await fetchHtml("/spa-server")).to.include('<div id="root"></div>');
    await page.goto(getServerUrl() + "/spa-server");
    // SpaControls reads window while it renders
    await page.waitForSelector("#spa-rerender");
    expect(await page.textContent("#spa-rendered-on")).to.equal("Rendered on the server");
    const renders = Number(await page.textContent("#spa-renders"));
    await page.click("#spa-rerender");
    await autoRetry(async () => {
      expect(Number(await page.textContent("#spa-renders"))).to.be.greaterThan(renders);
    });
    await page.goto(getServerUrl() + "/");
    await waitForHydration("#counter");
    await clickLink("/spa-server");
    await page.waitForSelector("#spa-rerender");
    expect(await page.textContent("#spa-rendered-on")).to.equal("Rendered on the server");
  });

  test("components: 'client': ssr: false on a page with a server component: the browser renders it before its Flight ends", async () => {
    // The page's load event waits for its Flight, which ends only once the page asks
    await page.goto(getServerUrl() + "/spa-promise", { waitUntil: "commit" });
    await page.click("button:text-is('Ask')");
    await page.waitForSelector("#answer:text-is('Answered once asked')");
  });
}

function testVikeReactImports() {
  test("components: 'client': vike-react's useData(), useHydrated() and <ClientOnly> from vike-react-rsc, in a React.lazy +Wrapper", async () => {
    const html = await fetchHtml("/hooks");
    expect(html).to.include("Data from +data");
    expect(html).to.include("Not hydrated yet");
    expect(html).to.include("Loading in the browser");
    expect(html).to.not.include("Rendered in the browser");
    await page.goto(getServerUrl() + "/hooks");
    await page.waitForSelector("text=Rendered in the browser");
    expect(await page.textContent("#hydrated")).to.equal("Hydrated");
    expect(await page.textContent("#data")).to.equal("Data from +data");
    expect(await page.$("#lazy-wrapper")).to.not.equal(null);
  });

  test('components: \'client\': usePageContext() and useData() in an async server component and in a file that a server component and a "use client" file import, on the first load and after a client navigation', async () => {
    const expectPageInfo = async () => {
      for (const id of ["#async-server", "#shared-server", "#shared-client"]) {
        expect(await page.textContent(id), id).to.equal("/server-hooks: Data from +data");
      }
    };
    await page.goto(getServerUrl() + "/server-hooks");
    await waitForHydration("#layout-counter");
    await expectPageInfo();
    await page.goto(getServerUrl() + "/");
    await waitForHydration("#counter");
    await clickLink("/server-hooks");
    await page.waitForSelector("#pathname:text-is('/server-hooks') ~ main #async-server");
    await expectPageInfo();
  });

  test("components: 'client': vike-react's useConfig() and <Head> in a client component set the HTML head, and useConfig() the title on a client navigation", async () => {
    const html = await fetchHtml("/use-config");
    const head = html.slice(0, html.indexOf("</head>"));
    expect(head).to.include("<title>useConfig() in a client component</title>");
    expect(head).to.include('<meta name="use-config" content="Head in a client component"/>');
    await page.goto(getServerUrl() + "/");
    await waitForHydration("#counter");
    await clickLink("/use-config");
    await autoRetry(async () => expect(await page.title()).to.equal("useConfig() in a client component"));
  });

  test("components: 'client': useConfig() in a server component sets the HTML head, and logs how to fix it", async () => {
    const html = await fetchHtml("/use-config-server");
    expect(html.slice(0, html.indexOf("</head>"))).to.include("<title>useConfig() in a server component</title>");
    expectLog(USE_CONFIG_IN_SERVER_COMPONENT_ERROR);
  });

  test("components: 'client': a server component renders <ClientOnly> through a client component, and calls useHydrated()", async () => {
    // The child reads window when its module loads, so loading it on the server would fail the render
    const html = await fetchHtml("/client-only");
    expect(html).to.include("Loading in the browser");
    expect(html).to.not.include("Window width");
    await page.goto(getServerUrl() + "/client-only");
    await page.waitForSelector("text=Window width");
    // A server component renders only on the server
    expect(await page.textContent("#hydrated")).to.equal("Not hydrated");
  });
}

function testFormBeforeHydration() {
  test("components: 'client': a form submitted before hydration keeps useActionState()'s state", async () => {
    await withoutScripts(async (noJs) => {
      await noJs.goto(getServerUrl() + "/form");
      await noJs.click('button:has-text("Count a submit")');
      await noJs.waitForSelector("#submits:has-text('Submitted 1 times')");
      await noJs.click('button:has-text("Count a submit")');
      await noJs.waitForSelector("#submits:has-text('Submitted 2 times')");
    });

    // form.submit() skips React's handler, as a submit before hydration does: the page hydrates with the state the
    // server rendered, then counts on
    await page.goto(getServerUrl() + "/form");
    await waitForHydration("button");
    await Promise.all([page.waitForNavigation(), page.evaluate(() => document.querySelector("form")!.submit())]);
    await waitForHydration("button");
    expect(await page.textContent("#submits")).to.equal("Submitted 1 times");
    await page.click('button:has-text("Count a submit")');
    await autoRetry(async () => {
      expect(await page.textContent("#submits")).to.equal("Submitted 2 times");
    });
  });
}

function testRestoredFormState() {
  test("components: 'client': +react's formState renders and hydrates a request without a form submit, as in vike-react", async () => {
    // The submit's state, which the page saves in a cookie
    await withoutScripts(async (noJs) => {
      await noJs.goto(getServerUrl() + "/form-restored");
      await noJs.click('button:has-text("Count a submit")');
      await noJs.waitForSelector("#submits:has-text('Submitted 1 times')");
      await page.context().addCookies(await noJs.context().cookies());
    });
    const response = await page.goto(getServerUrl() + "/form-restored");
    expect(await response!.text()).to.include("Submitted <!-- -->1<!-- --> times");
    await waitForHydration("button");
    expect(await page.textContent("#submits")).to.equal("Submitted 1 times");
    await page.context().clearCookies({ name: "restored-form" });
  });
}

async function withoutScripts(run: (noJs: typeof page) => Promise<void>) {
  const context = await page.context().browser()!.newContext();
  await context.route("**/*", (route) => (route.request().resourceType() === "script" ? route.abort() : route.continue()));
  try {
    await run(await context.newPage());
  } finally {
    await context.close();
  }
}

function testLoading() {
  test("components: 'client': +Loading.tsx, or a Loading whose layout a +config file imports, streams before the server page it waits for", async () => {
    for (const [pathname, id] of [
      ["/loading", "loading"],
      ["/loading-config", "config-loading"],
    ]) {
      const html = await fetchHtml(pathname);
      const fallback = html.indexOf(`<p id="${id}">`);
      expect(fallback, `fallback missing from ${pathname}`).to.not.equal(-1);
      expect(html.indexOf('<p id="loaded">')).to.be.greaterThan(fallback);
    }
  });

  test("components: 'client': a Loading's layout that a value imports from a package with a react-server export runs where the browser's file says, from the file its conditions give, on a client navigation too, and from a package with an import and a require file, the import one", async () => {
    for (const [pathname, fallback] of [
      ["/react-server-loading", '<p id="npm-loading">The default file of a loading layout...</p>'],
      ["/react-server-loading-marked", '<p id="npm-server-loading">The react-server file of a server loading layout</p>'],
      ["/dual-loading", '<button id="npm-dual-layout-counter">npm dual layout 0</button>'],
    ]) {
      const html = await fetchHtml(pathname);
      expect(html, `fallback missing from ${pathname}`).to.include(fallback);
      expect(html.indexOf('<p id="loaded">')).to.be.greaterThan(html.indexOf(fallback));
    }
    await page.goto(getServerUrl() + "/react-server-loading");
    await waitForHydration("#layout-counter");
    await clickLink("/react-server-loading-marked");
    await page.waitForSelector("#pathname:text-is('/react-server-loading-marked') ~ main #loaded");
  });

  test("components: 'client': a +Loading without layout adds no Suspense boundary, as in vike-react", async () => {
    const html = await fetchHtml("/loading-component");
    expect(html).to.include('<p id="loaded">');
    // React's marker of a boundary whose content streams in later
    expect(html).to.not.include("<!--$?-->");
  });
}

function testServerFunctionComponents() {
  test('Build: "use server" in a +Page fails the build, in a .js file and after "use strict" too', async () => {
    // #6's first spelling of a server component: plugin-rsc makes the async Page a server function
    const output = await getBuildError(
      "./pages/js-page/+Page.js",
      (source) => `"use strict";\n"use server";\n${source.replace("function Page", "async function Page")}`
    );
    expect(output).to.include(`pages/js-page/+Page.js ${SERVER_FUNCTION_COMPONENT_ERROR}`);
  });

  test('Build: a "use server" export rendered as a component fails the build, by JSX or by createElement() imported as another name', async () => {
    const useServer = (source: string) => source.replace('"use server component";', '"use server";');
    const error = `pages/markdown/+Page.tsx renders Markdown, but components/Markdown.tsx ${SERVER_FUNCTION_COMPONENT_ERROR}`;
    expect(await getBuildError("./components/Markdown.tsx", useServer)).to.include(error);
    editFile("./components/Markdown.tsx", useServer);
    const output = await getBuildError("./pages/markdown/+Page.tsx", (source) =>
      source
        .replace("import { Markdown }", 'import { createElement as h } from "react";\n$&')
        .replace(/<Markdown source=(".*") \/>/, "h(Markdown, { source: $1 })")
    );
    expect(output).to.include(error);
  });
}

function testClientHooks() {
  test('Dev: <ClientOnly> in a server component throws, saying to render it in a "use client" file', async () => {
    await expectHelperPageError(
      `"use server component";\nimport { ClientOnly } from "vike-react-rsc/ClientOnly";\nexport default function Page() {\n  return <ClientOnly><p>Rendered in the browser</p></ClientOnly>;\n}\n`,
      `<ClientOnly> ${CLIENT_HOOK_ERROR}: render it in a "use client" file, so its children never load on the server`
    );
  });

  test('Dev: a server component calling useState() gets React\'s error, naming its file and "use client"', async () => {
    await expectHelperPageError(
      `"use server component";\nimport { useState } from "react";\nexport default function Page() {\n  useState(0);\n  return null;\n}\n`,
      `pages/helper/+Page.tsx calls useState(), ${CLIENT_API_ERROR}: start it with "use client": TypeError`
    );
  });

  test("Dev: a page that a server component import moves to the server and that calls useState() gets React's error, naming its file, the import and the fix", async () => {
    await expectHelperPageError(
      'import { useState } from "react";\nimport { Markdown } from "../../components/Markdown";\nexport default function Page() {\n  useState(0);\n  return <Markdown source="A page" />;\n}\n',
      `pages/helper/+Page.tsx calls useState(), ${CLIENT_API_ERROR}, as pages/helper/+Page.tsx imports the server component components/Markdown.tsx: ` +
        'move the code that calls useState() into a "use client" component, or remove "use server component" from components/Markdown.tsx: TypeError'
    );
  });

  test('Dev: a file that calls useState() on a page that a server component import moves to the server, but that imports none, gets React\'s error, naming its file and "use client"', async () => {
    editFile("./components/Leaf.tsx", (source) => `import { useState } from "react";\n${source.replace("export function Leaf() {", "$&\n  useState(0);")}`);
    await expectHelperPageError(
      'import { Markdown } from "../../components/Markdown";\nimport { Leaf } from "../../components/Leaf";\nexport default function Page() {\n  return <><Markdown source="A page" /><Leaf /></>;\n}\n',
      `components/Leaf.tsx calls useState(), ${CLIENT_API_ERROR}: start it with "use client": TypeError`
    );
  });

  test('Dev: a server file calling createContext() or extending Component as it loads gets the same hint', async () => {
    for (const [code, use] of [
      ['import { createContext } from "react";\nconst Context = createContext(null);\nexport default function Page() {\n  return null;\n}\n', "calls createContext()"],
      ['import { Component } from "react";\nexport default class Page extends Component {\n  render() {\n    return null;\n  }\n}\n', "extends Component or PureComponent"],
    ]) {
      await expectHelperPageError(`"use server component";\n${code}`, `pages/helper/+Page.tsx ${use}, ${CLIENT_API_ERROR}: start it with "use client"`);
    }
  });
}

// /helper with `source` as its +Page answers 500 and logs `log`, then 200 again once the page is reverted
async function expectHelperPageError(source: string, log: string) {
  editFile("./pages/helper/+Page.tsx", () => source);
  try {
    await autoRetry(async () => {
      expect((await fetch(getServerUrl() + "/helper")).status).to.equal(500);
    });
    expectLog(log);
  } finally {
    // Reverted within milliseconds, Vite sends no update for the fix
    await sleep(1000);
    editFileRevert();
  }
  await autoRetry(async () => {
    expect((await fetch(getServerUrl() + "/helper")).status).to.equal(200);
  });
  // Vite's file watcher drops a change to a file that comes within 50 ms of the last one, e.g. the next test's edit
  await sleep(100);
}

function testMarkerHmr() {
  test('Dev: adding or removing "use server component" reloads the page', async () => {
    await page.goto(getServerUrl() + "/hmr");
    await waitForHydration("#layout-counter");
    editFile("./pages/hmr/+Page.tsx", (source) =>
      `"use server component";\n${source.replace("Rendered by a client component", "Rendered by a server component")}`
    );
    await page.waitForSelector("text=Rendered by a server component");
    // Reverted while the page still loads, the page would hydrate with the reverted module
    await waitForHydration("#layout-counter");
    editFileRevert();
    await page.waitForSelector("text=Rendered by a client component");
  });

  test('Dev: adding or removing "use server component" in a file that a page imports moves the page to the server and back', async () => {
    await page.goto(getServerUrl() + "/hmr");
    await waitForHydration("#layout-counter");
    expect(await fetchHtml("/hmr")).to.not.include("rscPayload");
    editFile("./components/Leaf.tsx", (source) => `"use server component";\n${source.replace("A leaf without a directive", "A server leaf")}`);
    await page.waitForSelector("text=A server leaf");
    expect(await fetchHtml("/hmr")).to.include("rscPayload");
    // Reverted while the page still loads, the page would hydrate with the reverted module
    await waitForHydration("#layout-counter");
    editFileRevert();
    await page.waitForSelector("text=A leaf without a directive");
    expect(await fetchHtml("/hmr")).to.not.include("rscPayload");
  });

  test("Dev: deleting a + file or a +config file shows no error", async () => {
    // The dev server has loaded /hmr's +Page.tsx
    await page.goto(getServerUrl() + "/hmr");
    await page.goto(getServerUrl() + "/");
    await waitForHydration("#layout-counter");
    for (const file of ["pages/hmr/+Page.tsx", "pages/spa/+config.ts"]) {
      const filePath = fileURLToPath(new URL(file, import.meta.url));
      const source = readFileSync(filePath, "utf8");
      unlinkSync(filePath);
      try {
        await autoRetry(async () => {
          expectLog(`removed /${file}`);
        });
        await sleep(1000);
        expect(await page.$("vite-error-overlay")).to.equal(null);
      } finally {
        writeFileSync(filePath, source);
      }
      await autoRetry(async () => {
        expectLog(`created /${file}`);
      });
      // Vike logs it as its config reload starts, and a file deleted during that reload fails it
      await sleep(1000);
    }
  });
}

function testServerComponentHmr() {
  test("Dev: editing a server Page updates it without a reload, so the Layout keeps its state", async () => {
    await page.goto(getServerUrl() + "/server");
    await clickCounter("#layout-counter", "Layout 1");
    const timeOrigin = await page.evaluate(() => performance.timeOrigin);
    // Saved as an editor that empties the file first does
    await editFileEmptyingFirst("./pages/server/+Page.tsx", (source) => source.replace("<h1>A server page</h1>", "<h1>An edited server page</h1>"));
    await page.waitForSelector("text=An edited server page");
    // Vite's file watcher drops a change to a file that comes within 50 ms of the last one
    await sleep(100);
    editFileRevert();
    await page.waitForSelector("h1:text-is('A server page')");
    expect(await page.textContent("#layout-counter")).to.equal("Layout 1");
    expect(await page.evaluate(() => performance.timeOrigin)).to.equal(timeOrigin);
  });

  test("Dev: editing the react-server file of a package's server Layout updates it without a reload, so the page keeps its state", async () => {
    await page.goto(getServerUrl() + "/react-server-layout-marked/client");
    await clickCounter("#counter", "Counter 1");
    const timeOrigin = await page.evaluate(() => performance.timeOrigin);
    editFile("./react-server-layout/ServerLayout.server.js", (source) => source.replace("The react-server file", "The edited react-server file"));
    await page.waitForSelector("text=The edited react-server file of a server layout");
    await sleep(100);
    editFileRevert();
    await page.waitForSelector("#npm-server-layout:text-is('The react-server file of a server layout')");
    expect(await page.textContent("#counter")).to.equal("Counter 1");
    expect(await page.evaluate(() => performance.timeOrigin)).to.equal(timeOrigin);
  });
}

function testClientComponentHmr() {
  test("Dev: after an edit of the client Layout, client navigation shows each page and the Layout keeps its state, back on a page loaded before the edit too, without a reload", async () => {
    await page.goto(getServerUrl() + "/");
    await clickCounter("#layout-counter", "Layout 1");
    const timeOrigin = await page.evaluate(() => performance.timeOrigin);
    editFile("./pages/+Layout.tsx", (source) => source.replace("Layout {clicks}", "Edited layout {clicks}"));
    await page.waitForSelector("text=Edited layout 1");
    await page.click('a[href="/server"]');
    await page.waitForSelector("text=Rendered on the server");
    expect(await page.textContent("#layout-counter")).to.equal("Edited layout 1");
    await page.click('a[href="/"]');
    await page.waitForSelector("h1:text-is('A client page')");
    expect(await page.textContent("#layout-counter")).to.equal("Edited layout 1");
    editFileRevert();
    await page.waitForSelector("#layout-counter:text-is('Layout 1')");
    expect(await page.evaluate(() => performance.timeOrigin)).to.equal(timeOrigin);
  });
}

function testServerComponentImports() {
  test('Build: a Page without a directive importing a server component with import() fails the build, saying to show it through rsc() or start the Page with "use server component"', async () => {
    const output = await getBuildError(
      "./pages/js-page/+Page.js",
      () =>
        'import { createElement, lazy } from "react";\n' +
        'const Markdown = lazy(() => import("../../components/Markdown").then(({ Markdown }) => ({ default: Markdown })));\n' +
        'export default function Page() {\n  return createElement(Markdown, { source: "**A** page" });\n}\n'
    );
    expect(output).to.include(
      'components/Markdown.tsx starts with "use server component", but the browser loads it: pages/js-page/+Page.js imports it. ' +
        'To show it in the browser, return it from a function in a "use server" file and render that function through rsc() from vike-react-rsc/client; ' +
        'or, if pages/js-page/+Page.js needs nothing from the browser (no hooks, no event handlers), start it with "use server component"; ' +
        "or, if pages/js-page/+Page.js imports only its types, write `import type`"
    );
  });

  test("Build: a client hook importing a server component fails the build, saying to show it through rsc() or import it only from server components", async () => {
    // The dev server sees the edit too, and renders nothing with it while no page is open
    await page.goto("about:blank");
    const output = await getBuildError(
      "./pages/after-render/+onAfterRenderClient.ts",
      () => 'import { Markdown } from "../../components/Markdown";\n\nexport function onAfterRenderClient() {\n  console.log(Markdown);\n}\n'
    );
    expect(output).to.include(
      'components/Markdown.tsx starts with "use server component", but the browser loads it: pages/after-render/+onAfterRenderClient.ts imports it. ' +
        'To show it in the browser, return it from a function in a "use server" file and render that function through rsc() from vike-react-rsc/client; ' +
        "or, import it only from server components; or, if pages/after-render/+onAfterRenderClient.ts imports only its types, write `import type`"
    );
  });

  test('Build: a "use client" file importing a server component fails the build, saying to show it through rsc() or remove "use client"', async () => {
    const output = await getBuildError(
      "./pages/js-page/+Page.js",
      () =>
        '"use client";\nimport { createElement } from "react";\nimport { Markdown } from "../../components/Markdown";\n' +
        'export default function Page() {\n  return createElement(Markdown, { source: "**A** page" });\n}\n'
    );
    expect(output).to.include(
      'components/Markdown.tsx starts with "use server component", but the browser loads it: pages/js-page/+Page.js starts with "use client" and imports it. ' +
        'To show it in the browser, return it from a function in a "use server" file and render that function through rsc() from vike-react-rsc/client; ' +
        'or, remove "use client" from pages/js-page/+Page.js, so it runs on the server, and move its hooks and event handlers into their own "use client" component'
    );
  });

  test('Build: a "use client" file importing a barrel that re-exports a server component fails the build, naming the barrel', async () => {
    // The dev server sees the edit too, and renders nothing with it while no page is open
    await page.goto("about:blank");
    const output = await getBuildError("./pages/index/+Page.tsx", (source) => `"use client";\n${source.replace("../../components/Counter", "../../components")}`);
    expect(output).to.include(
      'components/Markdown.tsx starts with "use server component", but the browser loads it: pages/index/+Page.tsx starts with "use client" and imports it through components/index.ts. ' +
        'To show it in the browser, return it from a function in a "use server" file and render that function through rsc() from vike-react-rsc/client; ' +
        'or, remove "use client" from pages/index/+Page.tsx, so it runs on the server, and move its hooks and event handlers into their own "use client" component'
    );
  });

  const importPackageServerComponent = () =>
    '"use client";\nimport { createElement } from "react";\nimport ServerBadge from "server-component-package/ServerBadge";\n' +
    'export default function Page() {\n  return createElement(ServerBadge, { label: "A badge" });\n}\n';
  const packageServerComponentInBrowser = `node_modules/server-component-package/ServerBadge.js ${SERVER_COMPONENT_IN_BROWSER_ERROR}: pages/js-page/+Page.js starts with "use client" and imports it.`;

  test('Build: a "use client" file importing a package\'s server component fails the build, naming the package\'s file', async () => {
    const output = await getBuildError("./pages/js-page/+Page.js", importPackageServerComponent);
    expect(output).to.include(
      `${packageServerComponentInBrowser} ` +
        'To show it in the browser, return it from a function in a "use server" file and render that function through rsc() from vike-react-rsc/client; ' +
        'or, remove "use client" from pages/js-page/+Page.js, so it runs on the server, and move its hooks and event handlers into their own "use client" component'
    );
  });

  test('Build: a "use client" file importing a package\'s server component with import() fails the build, saying to show it through rsc() or replace "use client" with "use server component"', async () => {
    const output = await getBuildError(
      "./pages/js-page/+Page.js",
      () =>
        '"use client";\nimport { createElement, lazy } from "react";\nconst ServerBadge = lazy(() => import("server-component-package/ServerBadge"));\n' +
        'export default function Page() {\n  return createElement(ServerBadge, { label: "A badge" });\n}\n'
    );
    expect(output).to.include(
      `${packageServerComponentInBrowser} ` +
        'To show it in the browser, return it from a function in a "use server" file and render that function through rsc() from vike-react-rsc/client; ' +
        'or, replace "use client" in pages/js-page/+Page.js with "use server component", and move its hooks and event handlers into their own "use client" component; ' +
        "or, if pages/js-page/+Page.js imports only its types, write `import type`"
    );
  });

  test('Build: a "use client" component importing a server component fails the build, saying to show it through rsc() or pass it in as children or a prop', async () => {
    // The dev server sees the edit too, and renders nothing with it while no page is open
    await page.goto("about:blank");
    const output = await getBuildError("./components/Counter.tsx", (source) =>
      source
        .replace('import { useState } from "react";', '$&\nimport { Markdown } from "./Markdown";')
        .replace("export function Counter() {", "$&\n  console.log(Markdown);")
    );
    expect(output).to.include(
      'components/Markdown.tsx starts with "use server component", but the browser loads it: components/Counter.tsx starts with "use client" and imports it. ' +
        'To show it in the browser, return it from a function in a "use server" file and render that function through rsc() from vike-react-rsc/client; ' +
        "or, render it in a server component and pass it to components/Counter.tsx as children or a prop; or, if components/Counter.tsx imports only its types, write `import type`"
    );
  });

  test('Dev: a "use client" file importing a package\'s server component, which the browser loads pre-bundled, gets the error', async () => {
    editFile("./pages/js-page/+Page.js", importPackageServerComponent);
    try {
      await page.goto(getServerUrl() + "/js-page");
      // Vite reloads the page once it has pre-bundled the package, and the reload would interrupt leaving the page.
      // The revert of the previous test can reload the page first, so only a load after Vite says it reloads counts
      const reloaded = page.waitForEvent("load", { predicate: () => isLogged("optimized dependencies changed. reloading") });
      await autoRetry(async () => {
        expectLog(packageServerComponentInBrowser, { filter: ({ logSource }) => logSource === "stderr" });
      });
      await reloaded;
    } finally {
      await page.goto("about:blank");
      editFileRevert();
    }
  });

  test("Build: a server + file re-exporting with export * fails the build, saying to name the export", async () => {
    // The dev server sees the edit too, and renders nothing with it while no page is open
    await page.goto("about:blank");
    const output = await getBuildError("./pages/server/+Page.tsx", () => '"use server component";\nexport * from "../../components/Markdown";\n');
    expect(output).to.include(
      `pages/server/+Page.tsx starts with "use server component", but export * from "../../components/Markdown" ${EXPORT_ALL_ERROR}: ` +
        'write export { Page } from "../../components/Markdown" or export { default } from "../../components/Markdown"'
    );
  });

  test('Dev: two "use client" pages import a server component: the error names the page the browser opens', async () => {
    // Rendered once mounted, so the HTML renders without it
    const importMarkdown = () =>
      '"use client";\nimport { createElement, useEffect, useState } from "react";\nimport { Markdown } from "../../components/Markdown";\n' +
      "export default function Page() {\n  const [isMounted, setIsMounted] = useState(false);\n  useEffect(() => setIsMounted(true), []);\n" +
      '  return isMounted ? createElement(Markdown, { source: "**A** page" }) : "waiting";\n}\n';
    editFile("./pages/js-page/+Page.js", importMarkdown);
    editFile("./pages/spa/+Page.tsx", importMarkdown);
    try {
      for (const [url, file] of [
        ["/js-page", "pages/js-page/+Page.js"],
        ["/spa", "pages/spa/+Page.tsx"],
      ]) {
        await page.goto(getServerUrl() + url);
        await autoRetry(async () => {
          expectLog(`components/Markdown.tsx ${SERVER_COMPONENT_IN_BROWSER_ERROR}: ${file} starts with "use client" and imports it.`, {
            filter: ({ logSource }) => logSource === "stderr",
          });
        });
      }
    } finally {
      await page.goto("about:blank");
      editFileRevert();
    }
  });

  test("Build: a barrel or +data.ts importing from a server component file builds", async () => {
    // The server page imports Counter from components/index.ts, which re-exports Markdown too
    editFile("./components/Markdown.tsx", (source) => `${source}\nexport const MARKDOWN_ID = "markdown";\n`);
    const { isSuccess } = await build("./pages/hooks/+data.ts", (source) =>
      `import { MARKDOWN_ID } from "../../components/Markdown";\n${source.replace('greeting: "Data from +data"', '$&, id: MARKDOWN_ID')}`
    );
    expect(isSuccess).to.equal(true);
    // Vike reloads the user files after the revert, and the lane's server stopping during that reload logs an error
    await sleep(1000);
  });
}

function testComponentsConfig() {
  test("Build: components set by a page, not once in the root +config.js, fails the build", async () => {
    // The dev server sees the edits too, and renders nothing with them while no page is open
    await page.goto("about:blank");
    const output = await getBuildError("./pages/spa/+config.ts", (source) =>
      source.replace("ssr: false,", 'ssr: false,\n  components: "server",')
    );
    expect(output).to.include("Set components once, in the root +config.js: pages set it to");
  });

  test("Build: ssr: false under components: 'server' builds, without a warning", async () => {
    const { isSuccess, output } = await build("./pages/+config.ts", (source) => source.replace('components: "client"', 'components: "server"'));
    expect(isSuccess).to.equal(true);
    expect(output).to.not.include("sets ssr to false");
  });
}

// `edit` applied to `file` as some editors save it: emptied, then written
async function editFileEmptyingFirst(file: string, edit: (source: string) => string) {
  const source = readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8");
  editFile(file, () => "");
  await sleep(30);
  editFile(file, () => edit(source));
}

// The build once `edit` is applied to `file`
async function build(file: string, edit: (source: string) => string): Promise<{ isSuccess: boolean; output: string }> {
  editFile(file, edit);
  try {
    const { stdout, stderr } = await promisify(execFile)("pnpm", ["exec", "vike", "build"], { cwd: fileURLToPath(new URL(".", import.meta.url)) });
    return { isSuccess: true, output: stdout + stderr };
  } catch (error) {
    const { stdout, stderr } = error as { stdout: string; stderr: string };
    return { isSuccess: false, output: stdout + stderr };
  } finally {
    editFileRevert();
  }
}

// The output of the build that fails once `edit` is applied to `file`
async function getBuildError(file: string, edit: (source: string) => string): Promise<string> {
  const { isSuccess, output } = await build(file, edit);
  if (isSuccess) throw new Error("The build succeeded");
  return output;
}

// Whether `log` was logged during the current test
function isLogged(log: string) {
  try {
    expectLog(log);
    return true;
  } catch {
    return false;
  }
}

// Until React has attached the button's handlers, a click doesn't do what a user's would
async function waitForHydration(selector: string) {
  await autoRetry(
    async () => {
      const isHydrated = await page.evaluate(
        (selector) => Object.keys(document.querySelector(selector) ?? {}).some((key) => key.startsWith("__reactProps$")),
        selector
      );
      expect(isHydrated).to.equal(true);
    },
    { timeout: 5000 }
  );
}

// Clicks the counter `selector` once React has hydrated it, then waits until it shows `text`
async function clickCounter(selector: string, text: string) {
  await waitForHydration(selector);
  await page.click(selector);
  await autoRetry(async () => {
    expect(await page.textContent(selector)).to.equal(text);
  });
}

// The page may have no link to `pathname`: one is added, then clicked as a user would, so Vike's router navigates
async function clickLink(pathname: string) {
  await page.evaluate((pathname) => document.body.insertAdjacentHTML("beforeend", `<a data-test-link href="${pathname}">Go</a>`), pathname);
  await page.click(`a[data-test-link][href="${pathname}"]`);
}
