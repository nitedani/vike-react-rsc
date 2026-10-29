# `vike-react-rsc`

React RSC integration for [Vike](https://vike.dev).

## Features

- **Server components**
  - Progressive rendering
  - Progressive hydration
  - **`throw redirect()`** and **`throw render()`** inside a server component
    - In the HTML, outside every `<Suspense>`, Vike answers them as in `guard()`: the redirect, `render(url)`'s page, or the error page and its status. A page that doesn't stream (see `+stream` below), and any page for a crawler, is rendered whole, so Vike answers them inside `<Suspense>` too.
    - Inside `<Suspense>`, on a client navigation, in an `rsc()` load and after `rerender()`, the browser still goes to the redirect's target (from the HTML, without JavaScript too). `render()` shows a blank page there, until Vike can show its error page from a component. With `components: 'client'`, a client navigation to a page that throws `render()` outside `<Suspense>` shows your error page instead.
    - On a client navigation, in an `rsc()` load or after `rerender()`, an error boundary of yours around the throwing component catches the redirect first and shows its fallback, so the browser stays on the page (Next has the same limit).
    - `Loading.layout` puts the page inside `<Suspense>`: on a page that streams, for a real 302 or 404 in a browser, throw in `guard()` or `data()`, or set `Loading = {}`.
- **Progressive adoption**: with `components: 'client'` in your root `+config.js`, the components of a `vike-react` app run as they do with `vike-react`. Then move a file to the server by starting it with `"use server component"`. It needs Vite 8, React 19.3.1+, `@vitejs/plugin-rsc` 0.5.36+ and Vike `0.4.268-commit-bba2caa` or 0.4.269+ (Vike 0.4.268 itself is too old).
  - A file runs where the file that imports it runs. A `Page`, `Layout`, `Wrapper` or `Loading`'s `layout`, as a `+` file or imported by a `+config` file, runs where `components` says (default: `'server'`).
  - A file without a directive that imports a `"use server component"` file, of the app or of a package, directly or through other such files, is a server component too, up to the `Page`, `Layout`, `Wrapper` or `Loading` that imports it. A `"use client"` file can't import one.
  - [`ssr: false`](https://vike.dev/ssr) leaves the page out of the first load's HTML, under either `components` value: the browser renders it, and its server components still run on the server.
  - [`+stream`](https://vike.dev/stream), as in `vike-react`: the first load's HTML streams with `stream: true`, or when an extension sets `stream.require` and the page doesn't set `stream: false`. Else it's sent at once, every `<Suspense>` resolved, and, unless an extension sets `stream.require`, [`+onAfterRenderHtml`](https://vike.dev/onAfterRenderHtml) gets `pageContext.pageHtmlString` instead of `pageContext.pageHtmlStream`.
  - [`+reactStrictMode`](https://vike.dev/reactStrictMode), as in `vike-react`: pages render in `<StrictMode>` unless it's `false`.
  - [`+react`](https://vike.dev/react-setting) takes `vike-react`'s options. `renderToStringOptions` apply where `vike-react` renders with `renderToString()`: on a page whose `+stream` neither enables nor requires streaming.
  - [`+onBeforeRenderHtml`](https://vike.dev/onBeforeRenderHtml) runs only for the first load's HTML, as in `vike-react`. What it assigns on `pageContext` reaches that HTML's client components and `+Head`, not server components: set what they need in [`+onCreatePageContext.server.js`](https://vike.dev/onCreatePageContext), which runs on a client navigation too.
  - A component that calls a hook such as `useState()` starts with `"use client"` when a server component imports it. A file that imports a server component can't, so its hooks move into their own `"use client"` component.
  - `vike-react`'s `useData()`, `useHydrated()`, `usePageContext()`, `useConfig()`, `<ClientOnly>`, `<Config>` and `<Head>` are at `vike-react-rsc/useData`, `/useHydrated`, `/usePageContext`, `/useConfig`, `/ClientOnly`, `/Config` and `/Head`. `useData()`, `usePageContext()`, `<Config>` and `<Head>` work in server components too. There, `useConfig()` sets only the HTML `<head>` of a full page load: render `<Config>` instead.
  - Install `vike-react-rsc` and also alias `vike-react` to it in your `package.json`, so that `vike-react/*` imports, in your files and in your dependencies, get `vike-react-rsc`'s, types included:
    ```json
    "vike-react-rsc": "^1",
    "vike-react": "npm:vike-react-rsc@^1"
    ```
    A vike-react extension whose `+config` requires `vike-react`, e.g. `vike-react-query`, works too: `vike-react-rsc` [provides](https://vike.dev/require#provide) `vike-react` 0.6.31.
- **Server actions**
  - You can call **`rerender()`** inside server actions to fully re-render & reload the full Server Component element tree. (Either you skip `rerender()` and you manage state changes on the client-side like classic React, or you use `rerender()` and you let the server-side re-render the new state.)
  - An action reads **`getRequestContext()`** (from `vike-react-rsc/server`): the request's `headers` and `cookies`, and what your server and your [`+middleware`](https://vike.dev/middleware) add (e.g. `user`). It leaves out what Vike and your app compute for a page: `routeParams`, the page's config, `data`, and what your `+onCreatePageContext` sets.
    ```ts
    import { getRequestContext } from "vike-react-rsc/server";
    const { user, cookies } = getRequestContext();
    ```
  - An action has no page, so `getPageContext()` and `usePageContext()` throw in it and in a component passed to `rsc()`, while the server components that component returns keep them, with the page's `data`. Without `rerender()`, server components that an action returns to JavaScript have no page either: to call `getPageContext()` in them, load them with `rsc()`.
  - Server components can call `getRequestContext()` too.
  - An action runs before `guard()` and `data()` of its request, so they see what it changed: `pageContext.cookies.get()` returns a cookie the action set. Without `rerender()`, an action called from JavaScript doesn't run them, as its answer is only what the action returned.
  - `guard()` doesn't protect an action: check authorization in the action itself, with what your auth [`+middleware`](https://vike.dev/middleware) adds.
  - An action's request body over **`rsc.bodySizeLimit`** bytes (default 1 MB) is refused with a 413, before it's buffered whole. Under `@vikejs/express`, a limit above 1 MB empties a `multipart/form-data` form posted to your own route with a body between 1 MB and the limit; once [magne4000/universal-middleware#457](https://github.com/magne4000/universal-middleware/pull/457) is released, it gets a 413 instead.
  - [Telefunc](https://telefunc.com) works next to server actions.
- **`pageContext.cookies`**: `get(name)`, `getAll()`, `has(name)`, `set(name, value, options)` and `delete(name, options)`.
  - In hooks such as `guard()` and `data()`, as `getPageContext().cookies` (from `vike-react-rsc/pageContext`) in a server component, and as `getRequestContext().cookies` (from `vike-react-rsc/server`) in a server action.
  - `get()`, `getAll()` and `has()` see a cookie set earlier in the same request.
  - `set()` and `delete()` throw while server components render: on a page that streams and on a client navigation, a component inside `<Suspense>` renders after the response's headers are sent.
  - Your own `+onCreatePageContext` runs before vike-react-rsc's, so `pageContext.cookies` isn't there yet: read `pageContext.headers.cookie` in it.
- **Head settings**: vike-react's [`+title`](https://vike.dev/title), [`+description`](https://vike.dev/description), [`+lang`](https://vike.dev/lang), [`+image`](https://vike.dev/image), [`+viewport`](https://vike.dev/viewport), [`+favicon`](https://vike.dev/favicon), [`+htmlAttributes`](https://vike.dev/htmlAttributes), [`+bodyAttributes`](https://vike.dev/bodyAttributes), [`+rootAttributes`](https://vike.dev/rootAttributes), [`+headHtmlBegin`](https://vike.dev/headHtmlBegin), [`+headHtmlEnd`](https://vike.dev/headHtmlEnd), [`+bodyHtmlBegin`](https://vike.dev/bodyHtmlBegin) and [`+bodyHtmlEnd`](https://vike.dev/bodyHtmlEnd), as in vike-react.
  - On a client navigation, `title`, `description` and `lang` change once the new page shows. A page that doesn't set one of them keeps the previous page's, so give each a default in your root `+config`. Their functions also run in the browser, so they read what reaches the client, such as `pageContext.data`.
  - Every page gets `<html lang="en">` and `<meta name="viewport" content="width=device-width,initial-scale=1">` unless `+lang` or `+viewport` says otherwise (`null` removes it from the HTML, but a client navigation sets `lang` to `"en"`). If your `+Head` has a viewport tag, remove it, or the page gets two.
- **RSC over RPC**: on the client-side upon user interaction (e.g. click on button "show details"), you can load Server Component elements instead of loading data. So that you don't have to load heavy Components (e.g. markdown) on the client-side — even if they are a part of a dynamic UI.
- Built-in default **`<Loading>` fallback**, customizable globally, per page, or per component.
- **Caching**: components loaded with `rsc()` are cached on the client for `rsc.staleTime` ms (default 1 minute, `0` disables). Page navigation always fetches a fresh payload.
- **Automatic server integration**
  - Works with any server: Express.js, Hono, etc. (powered by [universal-middleware](https://github.com/magne4000/universal-middleware))
  - Fully automatic (zero-config) if you use Vike's built-in [`+server`](https://vike.dev/server)

## Goal

- Feature parity with [`vike-react`](https://vike.dev/vike-react).
- Progressive adoption for `vike-react` users: replace `vike-react` with `vike-react-rsc` then progressively start using RSC on a component-by-component basis. See [#6 - Setting `+components: 'client' | 'server'` => default component type](https://github.com/nitedani/vike-react-rsc/issues/6).

## Demo

Example: [examples/full/](examples/full/)

It demonstrates local development (`pnpm dev`) and a production build served by Node.js (`pnpm preview`, via [`@universal-deploy/node`](https://github.com/photon-js/universal-deploy)).

> [!NOTE]
> Network requests are artificially slowed down to showcase RSC features such as progressive hydration.
