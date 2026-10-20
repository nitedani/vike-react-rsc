"use server component";
import type { ReactNode } from "react";

export async function ImportedServerLayout({ children }: { children: ReactNode }) {
  const where = await Promise.resolve(typeof window === "undefined" ? "server" : "browser");
  return (
    <section>
      <p id="imported-server-layout">An imported server layout, rendered on the {where}</p>
      {children}
    </section>
  );
}

export default async function ImportedServerWrapper({ children }: { children: ReactNode }) {
  return (
    <section>
      <p id="imported-server-wrapper">An imported server wrapper, rendered on the server</p>
      {children}
    </section>
  );
}
