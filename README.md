# `vike-react-rsc`

React RSC integration for [Vike](https://vike.dev).

## Features

- **Server components**
  - Progressive rendering
  - Progressive hydration
- **Server actions**
  - You can call **`rerender()`** inside server actions to fully re-render & reload the full Server Component element tree. (Either you skip `rerender()` and you manage state changes on the client-side like classic React, or you use `rerender()` and you let the server-side re-render the new state.)
- **RSC over RPC**: on the client-side upon user interaction (e.g. click on button "show details"), you can load Server Component elements instead of loading data. So that you don't have to load heavy Components (e.g. markdown) on the client-side — even if they are a part of a dynamic UI.
- Built-in default **`<Loading>` fallback**, customizable globally, per page, or per component.
- **Caching**
- **Automatic server integration**
  - Works with any server: Express.js, Hono, etc. (powered by [universal-middleware](https://github.com/magne4000/universal-middleware))
  - Fully automatic (zero-config) if you use [`vike-server`](https://vike.dev/server)

## Goal

- Feature parity with [`vike-react`](https://vike.dev/vike-react).
- Progressive adoption for `vike-react` users: replace `vike-react` with `vike-react-rsc` then progressively start using RSC on a component-by-component basis.

## Demo

Example: [examples/full/](examples/full/)  
Example deployed on Cloudflare: [vike-cloudflare-hono-demo.pages.dev](https://vike-cloudflare-hono-demo.pages.dev)  
> [!NOTE]
> Network requests are artificially slowed down to showcase RSC features such as progressive hydration.
