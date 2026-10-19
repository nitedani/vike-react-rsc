"use client";
export { ClientOnly }

import type { ReactElement, ReactNode } from 'react'
import { useHydrated } from '../hooks/useHydrated.js'

/**
 * Render children only on the client-side.
 *
 * Children are completely removed and never loaded on the server.
 *
 * https://vike.dev/ClientOnly
 */
function ClientOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }): ReactElement {
  const hydrated = useHydrated()

  return <>{hydrated ? children : fallback}</>
}
