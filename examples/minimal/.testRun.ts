export { testRun };
import { test, expect, run, page, autoRetry, getServerUrl } from "@brillout/test-e2e";

function testRun(cmd: `pnpm run ${"dev" | "preview"}`) {
  run(cmd, {
    serverIsReadyMessage: (log) => log.includes("Local:") || log.includes("ready in"),
    // The preview command builds before it serves
    additionalTimeout: cmd === "pnpm run dev" ? 0 : 60000,
  });

  test("an app with no vite.config hydrates: the counter counts", async () => {
    await page.goto(getServerUrl() + "/");
    expect(await page.textContent("h1")).to.equal("Rendered on the server");
    await autoRetry(async () => {
      await page.click("#counter");
      expect(await page.textContent("#counter")).to.not.equal("Counter 0");
    });
  });

  test("a server action returns its result", async () => {
    await page.click("#action");
    await autoRetry(async () => {
      expect(await page.textContent("#hello")).to.equal("Hello from a server action");
    });
  });

  test("rsc() shows what the server renders", async () => {
    await autoRetry(async () => {
      expect(await page.textContent("#details")).to.equal("Details from the server");
    });
  });
}
