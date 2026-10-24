export { withStrictMode }

import { StrictMode, type ReactElement } from 'react'
import type { PageContext } from 'vike/types'

// As vike-react's getPageElement()
function withStrictMode(pageContext: PageContext, page: ReactElement): ReactElement {
  return pageContext.config.reactStrictMode === false ? page : <StrictMode>{page}</StrictMode>
}
