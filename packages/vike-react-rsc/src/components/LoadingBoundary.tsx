"use client";
import { Suspense, type ReactNode } from "react";
import { usePageContext } from "../pageContext";

/** In the HTML and the browser, where a client +Loading is loaded: the Suspense boundary of its layout, if it has one */
export function LoadingBoundary({ children }: { children: ReactNode }): ReactNode {
  const Layout = usePageContext().config.Loading?.layout;
  return Layout ? <Suspense fallback={<Layout />}>{children}</Suspense> : children;
}
