import { render } from "vike/abort";

export default async function Page() {
  throw render("/abort/reason", {
    message: "Rewritten by a server component",
    at: new Date("2026-10-19T00:00:00.000Z"),
  });
}
