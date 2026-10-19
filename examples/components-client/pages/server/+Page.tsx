"use server component";
import { Counter } from "../../components";

export default async function Page() {
  const where = await Promise.resolve(typeof window === "undefined" ? "server" : "browser");
  return (
    <>
      <h1>A server page</h1>
      <p id="rendered-on">Rendered on the {where}</p>
      <Counter />
    </>
  );
}
