"use strict";
"use server component";

export default async function Page() {
  const where = await Promise.resolve(typeof window === "undefined" ? "server" : "browser");
  return <p id="rendered-on">Rendered on the {where}, marked after "use strict"</p>;
}
