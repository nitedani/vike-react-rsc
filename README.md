# `vike-react-rsc`

React RSC integration for [Vike](https://vike.dev).

## Features

- **Server components**
  - Progressive rendering
  - Progressive hydration
  - **`throw redirect()`** and **`throw render()`** work inside a server component. Before the HTML starts streaming, Vike answers them as it does in `guard()`: with the redirect, or with the error page and its status. Once it streams, and on a client navigation, in an `rsc()` load or after `rerender()`, the browser still goes to the redirect's target (from the HTML, without JavaScript too), but `render()` shows a blank page until Vike can show its error page from a component. On a client navigation, in an `rsc()` load or after `rerender()`, an error boundary of yours around the throwing component catches the redirect first and shows its fallback, so the browser stays on the page (Next has the same limit). With `Loading.layout`, every throw comes after the HTML starts, except for a crawler, which gets the page whole: for a real 302 or 404 in a browser, throw in `guard()` or `data()`, or set `Loading = {}`.
- **Server actions**
  - You can call **`rerender()`** inside server actions to fully re-render & reload the full Server Component element tree. (Either you skip `rerender()` and you manage state changes on the client-side like classic React, or you use `rerender()` and you let the server-side re-render the new state.)
  - An action runs before `guard()` and `data()` of its request, so they see what it changed: `pageContext.cookies.get()` returns a cookie the action set.
  - `guard()` doesn't protect an action: check authorization in the action itself.
  - An action's request body over **`rsc.bodySizeLimit`** bytes (default 1 MB) is refused with a 413, before it's buffered whole. Under `@vikejs/express`, a limit above 1 MB empties a `multipart/form-data` form posted to your own route with a body between 1 MB and the limit; once [magne4000/universal-middleware#457](https://github.com/magne4000/universal-middleware/pull/457) is released, it gets a 413 instead.
  - An action's `pageContext` has what your server and your [`+middleware`](https://vike.dev/middleware) add (e.g. `pageContext.user`).
- **`pageContext.cookies`**: `get(name)`, `getAll()`, `has(name)`, `set(name, value, options)` and `delete(name, options)`.
  - In hooks such as `guard()` and `data()`, and as `getPageContext().cookies` (from `vike-react-rsc/pageContext`) in a server action or a server component.
  - `get()`, `getAll()` and `has()` see a cookie set earlier in the same request.
  - `set()` and `delete()` throw while server components render, as a component inside `<Suspense>` renders after the response's headers are sent.
  - Your own `+onCreatePageContext` runs before vike-react-rsc's, so `pageContext.cookies` isn't there yet: read `pageContext.headers.cookie` in it.
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
