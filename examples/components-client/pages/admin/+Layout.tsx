"use server component";
import type { ReactNode } from "react";

export default async function Layout({ children }: { children: ReactNode }) {
  const where = await Promise.resolve(typeof window === "undefined" ? "server" : "browser");
  return (
    <section>
      <p id="admin-layout">A server layout, rendered on the {where}</p>
      {children}
    </section>
  );
}
