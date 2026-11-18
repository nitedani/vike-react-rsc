export { ssrEffect }

import type { ConfigEffect } from 'vike/types'

function ssrEffect({ configDefinedAt, configValue }: Parameters<ConfigEffect>[0]): ReturnType<ConfigEffect> {
  if (typeof configValue !== 'boolean') throw new Error(`${configDefinedAt} should be a boolean`)
  const env = {
    // ssr decides only the HTML: the rsc env keeps these, for server components and rerender()
    rsc: true,
    // Always load on the client-side.
    client: true,
    // Under ssr: false, the HTML env doesn't load them, and onRenderHtml() leaves the page out of the HTML
    server: configValue !== false,
  }
  return {
    meta: {
      Page: { env },
      Layout: { env },
      Loading: { env },
    },
  }
}
