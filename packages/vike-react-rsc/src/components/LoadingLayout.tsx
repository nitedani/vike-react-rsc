"use client";
import type { ReactNode } from "react";
import { usePageContext } from "../pageContext";

/** In the HTML and the browser, the Loading.layout of a page whose +Loading is a client component */
export function LoadingLayout(): ReactNode {
  const Layout = usePageContext().config.Loading?.layout;
  return Layout ? <Layout /> : null;
}
