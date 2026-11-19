import type { ReactNode } from "react";
import { LayoutPanel } from "./LayoutPanel";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <LayoutPanel />
      {children}
    </>
  );
}
