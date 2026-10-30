export { isComponentType }

import type { ReactNode } from 'react'
import { isCallable } from './isCallable.js'

// A +Head is a component (a function, memo or forwardRef) or a node (an element, a string, false, an iterable)
function isComponentType(value: unknown): value is () => ReactNode {
  return isCallable(value) || (typeof value === 'object' && value !== null && isMemoOrForwardRef(value))
}

function isMemoOrForwardRef(value: object): boolean {
  const { $$typeof } = value as { $$typeof?: unknown }
  return $$typeof === Symbol.for('react.memo') || $$typeof === Symbol.for('react.forward_ref')
}
