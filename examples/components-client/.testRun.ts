export { testRun };
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { test, expect, run, page, autoRetry, getServerUrl, editFile, editFileRevert, expectLog, fetch, fetchHtml, sleep } from "@brillout/test-e2e";

// What the errors the tests below cause say
const SERVER_FUNCTION_COMPONENT_ERROR = 'starts with "use server", which makes its exports server functions';
const CLIENT_FUNCTION_CALL_ERROR = "which is a client component file, so it can't run on the server";
const CLIENT_HOOK_ERROR = "is for client components";
const SSR_FALSE_ERROR = 'starts with "use server component", so it renders on the server';

function testRun(cmd: `pnpm run ${"dev" | "preview"}`) {
  const isDev = cmd === "pnpm run dev";

  run(cmd, {
    serverIsReadyMessage: (log) => log.includes("Local:") || log.includes("ready in"),
    // The preview command builds before it serves
    additionalTimeout: isDev ? 0 : 60000,
    tolerateError: ({ logSource, logText }) =>
      // testClientFunctionCalls() and testClientHooks(), and the dev server also sees the edits the builds make
      (logSource === "stderr" &&
        (logText.includes(CLIENT_FUNCTION_CALL_ERROR) ||
          logText.includes(CLIENT_HOOK_ERROR) ||
          logText.includes("HTTP response ← /helper 500") ||
          logText.includes("No error page found"))) ||
      // testComponentsConfig(): a page's error in the browser, then Vike's that the app has no error page to show for it,
      // which Vite forwards to stderr
      ((logSource === "Browser Error" || logSource === "stderr") &&
        (logText.includes(SSR_FALSE_ERROR) || logText.includes("No error page defined"))),
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
  if (isDev) testClientFunctionCalls();
  if (isDev) testClientHooks();
  if (isDev) testMarkerHmr();
  if (isDev) testServerComponentHmr();
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

  test("components: 'client': an unmarked +Page.js is a client component, in a server layout too, as in vike-react", async () => {
    await page.goto(getServerUrl() + "/admin/js-page");
    expect(await page.textContent("#admin-layout")).to.equal("A server layout, rendered on the server");
    await waitForHydration("#js-counter");
    await page.click("#js-counter");
    await autoRetry(async () => {
      expect(await page.textContent("#js-counter")).to.equal("JS counter 1");
    });
  });
}

function testServerComponents() {
  test('components: \'client\': "use server component" marks a server component, after "use strict" too', async () => {
    await page.goto(getServerUrl() + "/server");
    expect(await page.textContent("#rendered-on")).to.equal("Rendered on the server");
    // The unmarked component it renders stays a client component
    await waitForHydration("#counter");
    await page.click("#counter");
    await autoRetry(async () => {
      expect(await page.textContent("#counter")).to.equal("Counter 1");
    });

    await page.goto(getServerUrl() + "/strict");
    await waitForHydration("#layout-counter");
    expect(await page.textContent("#rendered-on")).to.equal('Rendered on the server, marked after "use strict"');
  });
}

function testVikeReactRendering() {
  test("components: 'client': a page without server components renders as in vike-react, without a Flight", async () => {
    expect(await fetchHtml("/")).to.not.include("rscPayload");
    expect(await fetchHtml("/server")).to.include("rscPayload");
  });

  test("components: 'client': the root Layout keeps its state between client and server pages, and on Back", async () => {
    await page.goto(getServerUrl() + "/");
    await waitForHydration("#layout-counter");
    await page.click("#layout-counter");
    const layoutCounter = async () => expect(await page.textContent("#layout-counter")).to.equal("Layout 1");
    await autoRetry(layoutCounter);
    await page.click('a[href="/server"]');
    await page.waitForSelector("text=Rendered on the server");
    await layoutCounter();
    await page.click('a[href="/admin"]');
    await page.waitForSelector("text=A server layout, rendered on the server");
    await layoutCounter();
    await page.click('a[href="/"]');
    await page.waitForSelector("text=A client page");
    await layoutCounter();
    await page.goBack();
    await page.waitForSelector("text=A server layout, rendered on the server");
    await layoutCounter();
  });

  test("components: 'client': ssr: false renders the page in the browser only, after +onBeforeRenderClient", async () => {
    expect(await fetchHtml("/spa")).to.not.include("Rendered in the browser");
    await page.goto(getServerUrl() + "/spa");
    await page.waitForSelector("text=Rendered in the browser, after onBeforeRenderClient() for /spa");
  });
}

function testVikeReactImports() {
  test("components: 'client': vike-react's useData(), useHydrated() and <ClientOnly> from vike-react-rsc", async () => {
    const html = await fetchHtml("/hooks");
    expect(html).to.include("Data from +data");
    expect(html).to.include("Not hydrated yet");
    expect(html).to.include("Loading in the browser");
    expect(html).to.not.include("Rendered in the browser");
    await page.goto(getServerUrl() + "/hooks");
    await page.waitForSelector("text=Rendered in the browser");
    expect(await page.textContent("#hydrated")).to.equal("Hydrated");
    expect(await page.textContent("#data")).to.equal("Data from +data");
  });

  test("components: 'client': <ClientOnly> and useHydrated() in a server component", async () => {
    const html = await fetchHtml("/client-only");
    expect(html).to.include("Loading in the browser");
    expect(html).to.not.include('<button id="counter"');
    await page.goto(getServerUrl() + "/client-only");
    await waitForHydration("#counter");
    await page.click("#counter");
    await autoRetry(async () => {
      expect(await page.textContent("#counter")).to.equal("Counter 1");
    });
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

  test('Build: a "use server" export rendered as a component fails the build', async () => {
    const output = await getBuildError("./components/Markdown.tsx", (source) =>
      source.replace('"use server component";', '"use server";')
    );
    expect(output).to.include(`pages/markdown/+Page.tsx renders Markdown, but components/Markdown.tsx ${SERVER_FUNCTION_COMPONENT_ERROR}`);
  });
}

function testClientFunctionCalls() {
  // pages/helper/+Page.tsx with `imports` and `call`
  const helperPage = (imports: string, call: string) =>
    `"use server component";\n${imports}\nexport default function Page() {\n  return <>{${call}}</>;\n}\n`;
  const fix = 'move it to a .js or .ts file, or start components/Badge.tsx with "use server component"';

  test("Dev: a server component calling a function from a client component file gets an error naming the fix", async () => {
    expect((await fetch(getServerUrl() + "/helper")).status).to.equal(200);
    editFile("./pages/helper/+Page.tsx", () => helperPage('import { shout } from "../../components/Badge";', 'shout("new")'));
    try {
      await autoRetry(async () => {
        expect((await fetch(getServerUrl() + "/helper")).status).to.equal(500);
      });
      expectLog(`pages/helper/+Page.tsx calls shout() from components/Badge.tsx, ${CLIENT_FUNCTION_CALL_ERROR}: ${fix}`);
    } finally {
      // Reverted within milliseconds, Vite sends no update for the fix
      await sleep(1000);
      editFileRevert();
    }
    await autoRetry(async () => {
      expect((await fetch(getServerUrl() + "/helper")).status).to.equal(200);
    });
  });

  test("Build: a server component calling a function from a client component file fails the build, naming the fix", async () => {
    for (const [imports, call, called] of [
      ['import Badge from "../../components/Badge";', 'Badge({ label: "new" })', "Badge()"],
      ['import { shout } from "../../components/Badge";', 'shout("new")', "shout()"],
      ['import * as badge from "../../components/Badge";', 'badge.shout("new")', "badge.shout()"],
      ['import Badge, { shout } from "../../components/Badge";', '<Badge label={shout("new")} />', "shout()"],
    ]) {
      const output = await getBuildError("./pages/helper/+Page.tsx", () => helperPage(imports!, call!));
      expect(output).to.include(`pages/helper/+Page.tsx calls ${called} from components/Badge.tsx`);
      expect(output).to.include(fix);
    }
  });
}

function testClientHooks() {
  test("Dev: usePageContext() and useData() in a server component throw, naming what to call instead", async () => {
    for (const [hook, fix] of [
      ["usePageContext", "call getPageContext() in a server component or a server action"],
      ["useData", "read getPageContext().data in a server component"],
    ]) {
      editFile("./pages/helper/+Page.tsx", () =>
        `"use server component";\nimport { ${hook} } from "vike-react-rsc/${hook}";\nexport default function Page() {\n  ${hook}();\n  return null;\n}\n`
      );
      try {
        await autoRetry(async () => {
          expect((await fetch(getServerUrl() + "/helper")).status).to.equal(500);
        });
        expectLog(`${hook}() ${CLIENT_HOOK_ERROR}: ${fix}`);
      } finally {
        // Reverted within milliseconds, Vite sends no update for the fix
        await sleep(1000);
        editFileRevert();
      }
      await autoRetry(async () => {
        expect((await fetch(getServerUrl() + "/helper")).status).to.equal(200);
      });
    }
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
    editFileRevert();
    await page.waitForSelector("h1:text-is('A server page')");
    expect(await page.textContent("#layout-counter")).to.equal("Layout 1");
    expect(await page.evaluate(() => performance.timeOrigin)).to.equal(timeOrigin);
  });
}

function testServerComponentImports() {
  test("Build: a client component importing a server component fails the build, saying to mark the importer", async () => {
    const output = await getBuildError(
      "./pages/js-page/+Page.js",
      () =>
        'import { createElement } from "react";\nimport { Markdown } from "../../components/Markdown";\n' +
        'export default function Page() {\n  return createElement(Markdown, { source: "**A** page" });\n}\n'
    );
    expect(output).to.include(
      'pages/js-page/+Page.js imports components/Markdown.tsx, which starts with "use server component", so it\'s a client component importing a server component: start pages/js-page/+Page.js with "use server component" too'
    );
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

  test("Dev: ssr: false on a page with a server component throws in the browser, naming both", async () => {
    editFile("./pages/spa/+Page.tsx", (source) => `"use server component";\n${source}`);
    try {
      await page.goto(getServerUrl() + "/spa");
      await autoRetry(async () => {
        expectLog(
          `pages/spa/+Page.tsx ${SSR_FALSE_ERROR}, but the page /pages/spa sets ssr to false, so it renders only in the browser: remove "use server component" or ssr: false`,
          { filter: ({ logSource }) => logSource === "Browser Error" }
        );
      });
    } finally {
      await page.goto("about:blank");
      editFileRevert();
    }
  });

  test("Build: ssr: false under components: 'server' builds, with a warning", async () => {
    const { isSuccess, output } = await build("./pages/+config.ts", (source) => source.replace('components: "client"', 'components: "server"'));
    expect(isSuccess).to.equal(true);
    expect(output).to.include(
      "[vike-react-rsc][Warning] /pages/spa/+config.ts > export default { ssr } sets ssr to false, which applies only under components: 'client'"
    );
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
