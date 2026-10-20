"use server component";

export type * from "../../components/Badge";

export default async function Page() {
  const where = await Promise.resolve(typeof window === "undefined" ? "server" : "browser");
  return <p id="rendered-on">Rendered on the {where}, next to an export type *</p>;
}
