import type { ReactNode } from "react";

export default function LazyWrapper({ children }: { children: ReactNode }) {
  return <div id="lazy-wrapper">{children}</div>;
}
