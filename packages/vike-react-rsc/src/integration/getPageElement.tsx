export { getPageElement }

import React, { Suspense } from 'react'
import type { PageContext } from 'vike/types'
import { LoadingBoundary } from 'virtual:vike-react-rsc/LoadingBoundary'

// vike-react's, without its providers: a page's Flight is this element too, rendered in the rsc env, and the browser's
// Root wraps either in the same PageContextProvider, so the Layouts keep their state between the two
function getPageElement(pageContext: PageContext): React.JSX.Element | null {
  const {
    config: { Page, Loading },
  } = pageContext
  let page = Page ? <Page /> : null

  // Wrapping
  const addSuspense = (el: React.JSX.Element | null) => {
    // Around each layer of every page or of none, the same in every env, so the Layouts keep their state between pages
    if (LoadingBoundary) {
      const Boundary = asLazy(LoadingBoundary)
      return <Boundary fallback={Loading?.layout && <Loading.layout />}>{page}</Boundary>
    }
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
    const Layer = asLazy(Wrap)
    page = <Layer>{page}</Layer>
    page = addSuspense(page)
  })

  return page
}

// React keeps a layer whose type changes from plain to lazy, as a Flight's client components are, but not from lazy to plain
// TODO: remove once https://github.com/react/react/issues/37899 is fixed and released
// One lazy per component: Fast Refresh keeps a layer's state only for the same type, e.g. from a page loaded before an edit
const lazyTypes = new WeakMap<React.ComponentType<any>, React.ComponentType<any>>()
function asLazy<Props>(Component: React.ComponentType<Props>): React.ComponentType<Props> {
  // A lazy that resolves to a lazy is React's error #306, so a user's React.lazy component keeps its own type
  if (import.meta.env.SSR || (Component as { $$typeof?: symbol }).$$typeof === Symbol.for('react.lazy')) return Component
  let lazy = lazyTypes.get(Component)
  if (!lazy) {
    const loaded = { then: (resolve: (module: { default: typeof Component }) => void) => resolve({ default: Component }) }
    lazyTypes.set(Component, (lazy = React.lazy(() => loaded as unknown as Promise<{ default: typeof Component }>)))
  }
  return lazy as React.ComponentType<Props>
}
