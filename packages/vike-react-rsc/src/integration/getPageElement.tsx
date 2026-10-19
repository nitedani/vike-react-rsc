export { getPageElement }

import React, { Suspense, type ComponentType, type ReactNode } from 'react'
import type { PageContext } from 'vike/types'

// vike-react's, without its providers: a page's Flight is this element too, rendered in the rsc env, and the browser's
// Root wraps either in the same PageContextProvider, so the Layouts keep their state between the two
function getPageElement(pageContext: PageContext, LoadingBoundary?: ComponentType<{ children: ReactNode }>): React.JSX.Element | null {
  const {
    config: { Page, Loading },
  } = pageContext
  // The same element in a Flight (a client +Loading's stub has it) and in a client page's tree (the caller passes it)
  const Boundary = Loading && (Loading.boundary ?? LoadingBoundary)
  let page = Page ? <Page /> : null

  // Wrapping
  const addSuspense = (el: React.JSX.Element | null) => {
    if (Boundary) return <Boundary>{page}</Boundary>
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
