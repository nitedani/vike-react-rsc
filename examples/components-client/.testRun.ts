export { testRun };
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { test, expect, run, page, autoRetry, getServerUrl, editFile, editFileRevert } from "@brillout/test-e2e";

// The message of the build errors testServerFunctionComponents() causes, which the dev server also logs
const SERVER_FUNCTION_COMPONENT_ERROR = 'starts with "use server", which makes its exports server functions';

function testRun(cmd: `pnpm run ${"dev" | "preview"}`) {
  const isDev = cmd === "pnpm run dev";

  run(cmd, {
    serverIsReadyMessage: (log) => log.includes("Local:") || log.includes("ready in"),
    // The preview command builds before it serves
    additionalTimeout: isDev ? 0 : 60000,
  });

  testClientComponents();
  testServerComponents();
  // The dev server serves the sources, so a build can run beside it
  if (isDev) testServerFunctionComponents();
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

// The output of the build that fails once `edit` is applied to `file`
async function getBuildError(file: string, edit: (source: string) => string): Promise<string> {
  editFile(file, edit);
  try {
    await promisify(execFile)("pnpm", ["exec", "vike", "build"], { cwd: fileURLToPath(new URL(".", import.meta.url)) });
  } catch (error) {
    const { stdout, stderr } = error as { stdout: string; stderr: string };
    return stdout + stderr;
  } finally {
    editFileRevert();
  }
  throw new Error("The build succeeded");
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
