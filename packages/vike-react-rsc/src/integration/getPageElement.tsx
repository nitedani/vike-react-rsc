export { getPageElement }

import React, { Suspense } from 'react'
import type { PageContext } from 'vike/types'

// vike-react's, without its providers: a page's Flight is this element too, rendered in the rsc env, and the browser's
// Root wraps either in the same PageContextProvider, so the Layouts keep their state between the two
function getPageElement(pageContext: PageContext): React.JSX.Element | null {
  const {
    config: { Page, Loading },
  } = pageContext
  let page = Page ? <Page /> : null

  // Wrapping
  const addSuspense = (el: React.JSX.Element | null) => {
    if (!Loading?.layout) return el
    return <Suspense fallback={<Loading.layout />}>{page}</Suspense>
  }
  page = addSuspense(page)
  ;[
    // Inner wrapping
    ...(pageContext.config.Layout || []),
    // Outer wrapping
    ...(pageContext.config.Wrapper || []),
  ].forEach((Wrap) => {
    page = <Wrap>{page}</Wrap>
    page = addSuspense(page)
  })

  return page
}
