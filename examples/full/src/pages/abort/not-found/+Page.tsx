import { render } from "vike/abort";

export default async function Page() {
  throw render(404);
}
