import { redirect } from "vike/abort";

export default async function Page() {
  throw redirect("/");
}
