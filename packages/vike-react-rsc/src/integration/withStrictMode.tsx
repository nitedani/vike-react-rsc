export { withStrictMode, isStrictMode }

import { StrictMode, type ReactElement } from 'react'
import type { PageContext } from 'vike/types'

// As vike-react's getPageElement()
function withStrictMode(pageContext: PageContext, page: ReactElement): ReactElement {
  return isStrictMode(pageContext) ? <StrictMode>{page}</StrictMode> : page
}

function isStrictMode(pageContext: PageContext): boolean {
  return pageContext.config.reactStrictMode !== false
}
