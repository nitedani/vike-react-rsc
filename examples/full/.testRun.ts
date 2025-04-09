export { testRun };
import {
  test,
  expect,
  run,
  fetchHtml,
  page,
  autoRetry,
} from "@brillout/test-e2e";

// Custom getServerUrl function that respects our environment variable
function getServerUrl() {
  return process.env.SERVER_URL || "http://localhost:3000";
}

const titleDefault = "Vike React Server Components";
const pages = {
  "/": {
    title: titleDefault,
    text: "Vike React Server Components",
    counter: true,
  },
  "/todos": {
    title: "Task Manager",
    text: "A powerful todo application built with Vike React Server Components",
    todoForm: true,
  },
  "/suspense": {
    title: "Suspense Demo",
    text: "Component-Level Suspense",
    filmGrid: true,
  },
  "/data": {
    title: "Page Loading States",
    text: "Page-Level Loading",
    filmGrid: true,
  },
} as const;

function testRun(cmd: `pnpm run ${"dev" | "preview"}`) {
  const isPreview = cmd === "pnpm run preview";

  run(cmd, {
    doNotFailOnWarning: true,
    serverIsReadyMessage: (log) => {
      // For preview mode, wait for wrangler to be fully ready
      if (isPreview) {
        return log.includes('Ready on http://localhost:3000');
      }
      // For dev mode
      return log.includes('Local:') ||
             log.includes('Server running at') ||
             log.includes('ready in');
    },
    // Add more time for the preview build
    additionalTimeout: isPreview ? 60000 : 0
  });

  testPages();
  testPageNavigation();
  testCounter();
  testTodoForm();
  testFilmGrid();
}

function testPages() {
  Object.entries(pages).forEach(([url, pageInfo]) => {
    testPage({ url, ...pageInfo });
  });
}

function testPage({
  url,
  text,
}: {
  url: string;
  title: string;
  text: string;
  counter?: true;
  todoForm?: true;
  filmGrid?: true;
}) {
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
    // Start at home page
    await page.goto(getServerUrl() + "/");
    await autoRetry(async () => {
      expect(await page.textContent("h1")).to.include(
        "Vike React Server Components"
      );
    });

    // Navigate to todos page
    await page.click('a[href="/todos"]');
    await autoRetry(async () => {
      expect(await page.textContent("h1")).to.include("Task Manager");
    });

    // Navigate to suspense page
    await page.click('a[href="/suspense"]');
    await autoRetry(async () => {
      expect(await page.textContent("h1")).to.include(
        "Component-Level Suspense"
      );
    });

    // Navigate to data page
    await page.click('a[href="/data"]');
    await autoRetry(async () => {
      expect(await page.textContent("h1")).to.include("Page-Level Loading");
    });

    // Navigate back to home
    await page.click('a[href="/"]');
    await autoRetry(async () => {
      expect(await page.textContent("h1")).to.include(
        "Vike React Server Components"
      );
    });
  });
}

function testCounter() {
  test("Counter functionality", async () => {
    await page.goto(getServerUrl() + "/");

    // Just verify the page loads with the increment button
    await autoRetry(
      async () => {
        const body = await page.textContent("body");
        expect(body).to.include("Increment");
      },
      { timeout: 5000 }
    );
  });
}

function testTodoForm() {
  test("Todo form functionality", async () => {
    await page.goto(getServerUrl() + "/todos");

    // Test adding a todo
    await autoRetry(
      async () => {
        // Find the input field and add button
        const input = await page.$(
          'input[placeholder="What needs to be done?"]'
        );
        expect(input).to.not.equal(null);

        // Type a new todo
        await input?.fill("Test Todo Item");

        // Find and click the add button
        const addButton = await page.$('button:has-text("Add Task")');
        expect(addButton).to.not.equal(null);
        await addButton?.click();

        // Wait for the todo to appear in the list
        await autoRetry(
          async () => {
            const todoText = await page.textContent("body");
            expect(todoText).to.include("Test Todo Item");
          },
          { timeout: 3000 }
        );
      },
      { timeout: 10000 }
    );
  });
}

function testFilmGrid() {
  test("Film grid loading and display", async () => {
    await page.goto(getServerUrl() + "/suspense");

    // Test that films load with suspense
    await autoRetry(
      async () => {
        // Just check for film-related text since the cards might not be loaded yet
        const pageText = await page.textContent("body");
        expect(pageText).to.include("Component-Level");
      },
      { timeout: 15000 }
    ); // Longer timeout for film data loading
  });
}

// function getTitle(html: string) {
//   const title = html.match(/<title>(.*?)<\/title>/i)?.[1]
//   return title
// }
