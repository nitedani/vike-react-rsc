export { testRun };
import { test, expect, run, page, autoRetry, getServerUrl } from "@brillout/test-e2e";

function testRun(cmd: `pnpm run ${"dev" | "preview"}`) {
  run(cmd, {
    serverIsReadyMessage: (log) => log.includes("Local:") || log.includes("ready in"),
    // The preview command builds before it serves
    additionalTimeout: cmd === "pnpm run dev" ? 0 : 60000,
    tolerateError: ({ logSource, logText }) =>
      // Rolldown's report of how long the build's plugins took, which depends on the machine's speed
      (cmd === "pnpm run preview" && logSource === "stderr" && logText.includes("[PLUGIN_TIMINGS]")) ||
      // Vike's report that a hook took longer than its warning threshold, which depends on the machine's speed
      logText.includes("is slow: it's taking more than"),
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
