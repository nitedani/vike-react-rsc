export { testRun };
import { execFile } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { test, expect, run, page, autoRetry, getServerUrl, editFile, editFileRevert, expectLog, fetch, fetchHtml, sleep } from "@brillout/test-e2e";

// What the errors the tests below cause say
// testServerComponentImports(): in dev, the error on the server, then the browser's for the page it can't load
const SERVER_COMPONENT_IN_BROWSER_ERROR = 'starts with "use server component", but the browser loads it';
const SERVER_FUNCTION_COMPONENT_ERROR = 'starts with "use server", which makes its exports server functions';
const CLIENT_HOOK_ERROR = "is for client components";
const CLIENT_API_ERROR = "which runs only in the browser, but runs on the server";

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
          logText.includes("useState is not a function") ||
          logText.includes("createContext is not a function") ||
          logText.includes("Class extends value undefined") ||
          logText.includes("HTTP response ← /helper 500") ||
          logText.includes("No error page found"))) ||
      logText.includes(SERVER_COMPONENT_IN_BROWSER_ERROR) ||
      (logSource === "Browser Error" && logText.includes("status of 500")) ||
      // Vite forwards these from the browser to stderr too
      logText.includes("Failed to fetch dynamically imported module") ||
      logText.includes("No error page defined"),
  });

  testClientComponents();
  testServerComponents();
  testLoading();
  testVikeReactRendering();
  testVikeReactImports();
  testFormBeforeHydration();
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
      await waitForHydration(counter);
      await page.click(counter);
      await autoRetry(async () => {
        expect(await page.textContent(counter)).to.equal(clicked);
      });
    }
  });
}

function testServerComponents() {
  test('components: \'client\': "use server component" marks a server component, after "use strict" too', async () => {
    await page.goto(getServerUrl() + "/server");
    expect(await page.textContent("#rendered-on")).to.equal("Rendered on the server");
    // The component it renders starts with "use client"
    await waitForHydration("#counter");
    await page.click("#counter");
    await autoRetry(async () => {
      expect(await page.textContent("#counter")).to.equal("Counter 1");
    });

    await page.goto(getServerUrl() + "/strict");
    await waitForHydration("#layout-counter");
    expect(await page.textContent("#rendered-on")).to.equal('Rendered on the server, marked after "use strict"');
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
    await waitForHydration("#imported-layout-counter");
    await page.click("#imported-layout-counter");
    await autoRetry(async () => {
      expect(await page.textContent("#imported-layout-counter")).to.equal("Imported layout 1");
    });
    await page.click('a[href="/imported-layout/server"]');
    await page.waitForSelector("text=A server page in an imported layout");
    expect(await page.textContent("#imported-layout-counter")).to.equal("Imported layout 1");
  });

  test("components: 'client': ssr: false renders the page in the browser only, after +onBeforeRenderClient", async () => {
    expect(await fetchHtml("/spa")).to.not.include("Rendered in the browser");
    await page.goto(getServerUrl() + "/spa");
    await page.waitForSelector("text=Rendered in the browser, after onBeforeRenderClient() for /spa");
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
    await page.evaluate(() => document.body.insertAdjacentHTML("beforeend", '<a id="spa-server" href="/spa-server">Go</a>'));
    await page.click("#spa-server");
    await page.waitForSelector("#spa-rerender");
    expect(await page.textContent("#spa-rendered-on")).to.equal("Rendered on the server");
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
  test("components: 'client': +Loading.tsx streams before the server page it waits for", async () => {
    const html = await fetchHtml("/loading");
    const fallback = html.indexOf('<p id="loading">');
    expect(fallback, "fallback missing from response").to.not.equal(-1);
    expect(html.indexOf('<p id="loaded">')).to.be.greaterThan(fallback);
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
  test("Dev: usePageContext() and useData() in a server component throw, naming what to call instead", async () => {
    for (const [hook, fix] of [
      ["usePageContext", "call getPageContext() in a server component or a server action"],
      ["useData", "read getPageContext().data in a server component"],
    ]) {
      await expectHelperPageError(
        `"use server component";\nimport { ${hook} } from "vike-react-rsc/${hook}";\nexport default function Page() {\n  ${hook}();\n  return null;\n}\n`,
        `${hook}() ${CLIENT_HOOK_ERROR}: ${fix}`
      );
    }
  });

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
    }
  });
}

function testServerComponentHmr() {
  test("Dev: editing a server Page updates it without a reload, so the Layout keeps its state", async () => {
    await page.goto(getServerUrl() + "/server");
    await waitForHydration("#layout-counter");
    await page.click("#layout-counter");
    await autoRetry(async () => {
      expect(await page.textContent("#layout-counter")).to.equal("Layout 1");
    });
    const timeOrigin = await page.evaluate(() => performance.timeOrigin);
    editFile("./pages/server/+Page.tsx", (source) => source.replace("<h1>A server page</h1>", "<h1>An edited server page</h1>"));
    await page.waitForSelector("text=An edited server page");
    // Vite's file watcher drops a change to a file that comes within 50 ms of the last one
    await sleep(100);
    editFileRevert();
    await page.waitForSelector("h1:text-is('A server page')");
    expect(await page.textContent("#layout-counter")).to.equal("Layout 1");
    expect(await page.evaluate(() => performance.timeOrigin)).to.equal(timeOrigin);
  });
}

function testClientComponentHmr() {
  test("Dev: after an edit of the client Layout, client navigation shows each page and the Layout keeps its state, back on a page loaded before the edit too, without a reload", async () => {
    await page.goto(getServerUrl() + "/");
    await waitForHydration("#layout-counter");
    await page.click("#layout-counter");
    await autoRetry(async () => {
      expect(await page.textContent("#layout-counter")).to.equal("Layout 1");
    });
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
  test("Build: a client component importing a server component fails the build, saying to show it through rsc() or mark the importer", async () => {
    const output = await getBuildError(
      "./pages/js-page/+Page.js",
      () =>
        'import { createElement } from "react";\nimport { Markdown } from "../../components/Markdown";\n' +
        'export default function Page() {\n  return createElement(Markdown, { source: "**A** page" });\n}\n'
    );
    expect(output).to.include(
      'components/Markdown.tsx starts with "use server component", but the browser loads it: pages/js-page/+Page.js imports it. ' +
        'To show it in the browser, return it from a function in a "use server" file and render that function through rsc() from vike-react-rsc/client; ' +
        'or, if pages/js-page/+Page.js needs nothing from the browser (no hooks, no event handlers), start it with "use server component"'
    );
  });

  test("Build: a client component importing a barrel that re-exports a server component fails the build, naming the barrel", async () => {
    // The dev server sees the edit too, and renders nothing with it while no page is open
    await page.goto("about:blank");
    const output = await getBuildError("./pages/index/+Page.tsx", (source) => source.replace("../../components/Counter", "../../components"));
    expect(output).to.include(
      'components/Markdown.tsx starts with "use server component", but the browser loads it: pages/index/+Page.tsx imports it through components/index.ts. ' +
        'To show it in the browser, return it from a function in a "use server" file and render that function through rsc() from vike-react-rsc/client; ' +
        'or, if pages/index/+Page.tsx needs nothing from the browser (no hooks, no event handlers), start it with "use server component"'
    );
  });

  test("Dev: two pages import a server component: the error names the page the browser opens", async () => {
    // Rendered once mounted, so the HTML renders without it
    const importMarkdown = () =>
      'import { createElement, useEffect, useState } from "react";\nimport { Markdown } from "../../components/Markdown";\n' +
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
          expectLog(`components/Markdown.tsx ${SERVER_COMPONENT_IN_BROWSER_ERROR}: ${file} imports it.`, {
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
