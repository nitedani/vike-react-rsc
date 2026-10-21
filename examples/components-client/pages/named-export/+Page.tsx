"use server component";

export async function Page() {
  const where = await Promise.resolve(typeof window === "undefined" ? "server" : "browser");
  return <p id="rendered-on">Rendered on the {where}, exported as Page</p>;
}
