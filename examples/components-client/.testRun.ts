export { testRun };
import { test, expect, run, page, autoRetry, getServerUrl } from "@brillout/test-e2e";

function testRun(cmd: `pnpm run ${"dev" | "preview"}`) {
  const isDev = cmd === "pnpm run dev";

  run(cmd, {
    serverIsReadyMessage: (log) => log.includes("Local:") || log.includes("ready in"),
    // The preview command builds before it serves
    additionalTimeout: isDev ? 0 : 60000,
  });

  testClientComponents();
  testServerComponents();
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
