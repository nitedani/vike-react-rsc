export { useConfig }
import type { PageContext, PageContextServer } from 'vike/types'
import type { ConfigViaHook, PageContextInternal } from '../../types.js'
import { usePageContext } from '../usePageContext.js'
import { getPageContext } from 'vike/getPageContext'
import { useStreamOptional } from 'react-streaming'
import { assert } from '../../utils/assert.js'
import { escapeJavaScriptExpression } from '../../utils/escapeJavaScriptExpression.js'
import { setPageContextConfigViaHook } from './setPageContextConfigViaHook.js'

/**
 * Set configurations inside components and Vike hooks.
 *
 * https://vike.dev/useConfig
 */
function useConfig(): (config: ConfigViaHook) => void {
  // Vike hook
  let pageContext = getPageContext({ asyncHook: false }) as PageContext & PageContextInternal
  if (pageContext) return (config: ConfigViaHook) => setPageContextConfigViaHook(config, pageContext)

  // Component
  pageContext = usePageContext()
  assert(!pageContext.isClientSide)
  const stream = useStreamOptional()
  return (config: ConfigViaHook) => {
    if (!pageContext._headAlreadySet) {
      setPageContextConfigViaHook(config, pageContext)
    } else {
      assert(stream)
      // <head> already sent to the browser => send DOM-manipulating scripts during HTML streaming
      apply(config, stream, pageContext)
    }
  }
}

type Stream = NonNullable<ReturnType<typeof useStreamOptional>>
function apply(config: ConfigViaHook, stream: Stream, pageContext: PageContextServer) {
  const { title } = config
  if (title) {
    // No need to escape the injected nonce attribute — see https://github.com/vikejs/vike/blob/36201ddad5f5b527b244b24d548014ec86c204e4/packages/vike/src/server/runtime/renderPageServer/csp.ts#L45
    const nonceAttr = pageContext.cspNonce ? ` nonce="${pageContext.cspNonce}"` : ''
    const titleJs = escapeJavaScriptExpression(JSON.stringify(title))
    const htmlSnippet = `<script${nonceAttr}>document.title = ${titleJs}</script>`
    stream.injectToStream(htmlSnippet)
  }
}
