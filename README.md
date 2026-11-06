<!-- WARNING: keep links absolute in this file so they work on NPM too -->

# `vike-react-rsc`

[React Server Components](https://react.dev/reference/rsc/server-components) for [Vike](https://vike.dev),
for new apps and for [`vike-react`](https://vike.dev/vike-react) apps moving to the server one file at a time.

## Getting started

```sh
npm install vike-react-rsc vike react react-dom react-server-dom-webpack vite @vitejs/plugin-rsc
```

```ts
// pages/+config.ts
import type { Config } from "vike/types";
import vikeReactRsc from "vike-react-rsc/config";

export default {
  extends: [vikeReactRsc],
} satisfies Config;
```

A page is a server component, so it can be `async`:

```tsx
// pages/index/+Page.tsx
import { Counter } from "./Counter";

export default async function Page() {
  const res = await fetch("https://brillout.github.io/star-wars/api/films/1.json");
  const film = await res.json();
  return (
    <>
      <h1>{film.title}</h1>
      <Counter />
    </>
  );
}
```

State and events go in a `"use client"` component:

```tsx
// pages/index/Counter.tsx
"use client";
import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}
```

Run `npx vike dev` and open http://localhost:3000. You don't need a `vite.config`.

For Fast Refresh, install `@vitejs/plugin-react` and add `plugins: [react()]` to a `vite.config.ts`.
For TypeScript, install `@types/react` and `@types/react-dom`.

## Server actions

An action is an async function exported from a `"use server"` file.
Pass it to `<form action>`, or call it from a client component to get what it returns.

```ts
// pages/todos/todos.ts
export const todos: string[] = [];
```

```ts
// pages/todos/actions.ts
"use server";
import { rerender } from "vike-react-rsc/server";
import { todos } from "./todos";

export async function addTodo(formData: FormData) {
  todos.push(String(formData.get("text")));
  rerender();
}
```

```tsx
// pages/todos/+Page.tsx
import { addTodo } from "./actions";
import { todos } from "./todos";

export default function Page() {
  return (
    <>
      <ul>
        {todos.map((todo, i) => (
          <li key={i}>{todo}</li>
        ))}
      </ul>
      <form action={addTodo}>
        <input name="text" />
        <button>Add</button>
      </form>
    </>
  );
}
```

`rerender()` renders the page again on the server after the action, running `guard()` and `data()`. Without it, the page stays as it is.

> [!WARNING]
> Any browser can call an action, and `guard()` doesn't protect it: check authorization in the action.

A request body over 1 MB gets a 413: raise the limit with `rsc: { bodySizeLimit: 10_000_000 }` (bytes) in `pages/+config.ts`.
Under `@vikejs/express`, a raised limit makes a plain `multipart/form-data` form over 1 MB, posted to your own route, arrive empty
([details](https://github.com/magne4000/universal-middleware/issues/463)).

## `rsc()`

`rsc()` loads a server component from the browser, e.g. on a click, so heavy code stays on the server.
It takes an export of a `"use server"` file and returns a client component:

```tsx
// pages/films/Details.tsx
"use server";

export async function Details({ id }: { id: number }) {
  const res = await fetch(`https://brillout.github.io/star-wars/api/films/${id}.json`);
  const film = await res.json();
  return <p>{film.opening_crawl}</p>;
}
```

```tsx
// pages/films/ShowDetails.tsx
"use client";
import { useState } from "react";
import { rsc } from "vike-react-rsc/client";
import { Details } from "./Details";

const DetailsRsc = rsc(Details);

export function ShowDetails() {
  const [shown, setShown] = useState(false);
  if (!shown) return <button onClick={() => setShown(true)}>Show details</button>;
  return <DetailsRsc id={1} fallback={<p>Loading…</p>} />;
}
```

Props go to the server component, and `fallback` shows until it loads (default: your [`+Loading`](https://vike.dev/Loading)'s `component`).
The browser reuses the result for `rsc: { staleTime }` ms (default 60 000), or until an action runs.
Any browser can call it too: check authorization in it.

## `getPageContext()` and `getRequestContext()`

`getPageContext()` works in a page's server components.
`getRequestContext()` also works in actions and `rsc()` components, which have no page.
It has the request's `headers`, `cookies`, `abortSignal`, and what your [`+middleware`](https://vike.dev/middleware) adds, e.g. `user`.

```tsx
// pages/settings/+Page.tsx
import { getPageContext } from "vike-react-rsc/pageContext";
import { setTheme } from "./actions";

export default function Page() {
  return (
    <form action={setTheme}>
      <p>Theme: {getPageContext().cookies.get("theme")}</p>
      <button name="theme" value="dark">Dark</button>
      <button name="theme" value="light">Light</button>
    </form>
  );
}
```

```ts
// pages/settings/actions.ts
"use server";
import { getRequestContext, rerender } from "vike-react-rsc/server";

export async function setTheme(formData: FormData) {
  getRequestContext().cookies.set("theme", String(formData.get("theme")), { path: "/" });
  rerender();
}
```

## `pageContext.cookies`

It has `get()`, `getAll()`, `has()`, `set()` and `delete()`. Hooks find it on `pageContext`:

```ts
// pages/account/+guard.ts
import { render } from "vike/abort";
import type { PageContextServer } from "vike/types";

export function guard(pageContext: PageContextServer) {
  if (!pageContext.cookies.has("session")) throw render("/login");
}
```

`set()` and `delete()` throw while server components render: call them in an action or a hook.

## Moving a `vike-react` app

Install `vike-react-rsc` and `@vitejs/plugin-rsc`, and alias `vike-react` to it, so `vike-react/*` imports and extensions such as `vike-react-query` use it:

```json
{
  "dependencies": {
    "vike-react-rsc": "^1",
    "vike-react": "npm:vike-react-rsc@^1"
  }
}
```

With `components: "client"` in your root `+config`, your components run as they do with `vike-react`:

```ts
// pages/+config.ts
import type { Config } from "vike/types";
import vikeReact from "vike-react/config";

export default {
  extends: [vikeReact],
  components: "client",
} satisfies Config;
```

Then move a file to the server by starting it with `"use server component"`:

```tsx
// pages/index/+Page.tsx
"use server component";

export default async function Page() {
  const res = await fetch("https://brillout.github.io/star-wars/api/films/1.json");
  const film = await res.json();
  return <h1>{film.title}</h1>;
}
```

A file without a directive that imports it becomes a server component too, so move that file's hooks into their own `"use client"` component.

## Same as `vike-react`

[Its settings](https://vike.dev/vike-react) work the same.
Its hooks and components have the same paths under `vike-react-rsc/`, e.g. `vike-react-rsc/useData`.
The HTML streams only with [`stream: true`](https://vike.dev/stream): without it, the first load waits for every `<Suspense>`.

## Error handling

A component that throws shows the nearest error boundary above it, else your [error page](https://vike.dev/error-page).
Boundaries only run in the browser, so on a first load, one needs a `<Suspense>` inside it.
[`throw redirect()`](https://vike.dev/redirect) and [`throw render()`](https://vike.dev/render) work in server components.

## Requirements and status

- Vite 8, React 19.3.1+, `@vitejs/plugin-rsc` 0.5.36+ and Vike 0.4.269+.
- Vike's built-in server or your own, e.g. Hono or Express, through [`+server`](https://vike.dev/server).
  [`vike-photon`](https://github.com/vikejs/vike-photon) isn't supported, as it's [deprecated](https://vike.dev/blog/universal-deploy).

The goal is feature parity with `vike-react`: [open an issue](https://github.com/nitedani/vike-react-rsc/issues) for anything that works worse here.

Examples: [examples/minimal](https://github.com/nitedani/vike-react-rsc/tree/main/examples/minimal),
[examples/components-client](https://github.com/nitedani/vike-react-rsc/tree/main/examples/components-client),
and [examples/full](https://github.com/nitedani/vike-react-rsc/tree/main/examples/full) (slowed down on purpose).
