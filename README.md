React RSC integration for [Vike](https://vike.dev).

Supports:
 - Server components
 - Server actions
 - `<Loading>`
 - Caching
 - Automatic server (Express.js, Hono, ...) integration

Goal:
 - Feature parity with [`vike-react`](https://vike.dev/vike-react) + RSC features.
 - Progressive adoption for `vike-react` users: replace `vike-react` with `vike-react-rsc` then progressively start using RSC on a component-by-component basis.

Example: [examples/full/](examples/full/)  
Example deployed on Cloudflare: [vike-cloudflare-hono-demo.pages.dev](https://vike-cloudflare-hono-demo.pages.dev)  
> [!NOTE]
> Network requests are artificially slowed down to showcase RSC features such as progressive hydration.
