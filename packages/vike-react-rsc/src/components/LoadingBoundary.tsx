"use client";
import { Suspense, type ReactNode } from "react";
import { usePageContext } from "../pageContext";

/** The Suspense boundary of the page's Loading.layout, if it has one: `fallback`, else the layout of a client +Loading,
 * which a Flight has only a reference to, read where the file is loaded */
export function LoadingBoundary({ children, fallback }: { children: ReactNode; fallback?: ReactNode }): ReactNode {
  const Layout = usePageContext().config.Loading?.layout;
  const shown = fallback ?? (Layout && <Layout />);
  return shown ? <Suspense fallback={shown}>{children}</Suspense> : children;
}
