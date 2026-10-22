import { redirect } from "vike/abort";
import { getRequestContext } from "vike-react-rsc/server";
import ActionsClient from "./ActionsClient";

export default function Page() {
  // Once after saveThenRedirectPage()
  const failNext = (globalThis as { __failNext?: { page?: boolean } }).__failNext;
  if (failNext?.page) {
    failNext.page = false;
    throw redirect("/");
  }
  return (
    <>
      <h1>Server action edge cases</h1>
      <p data-page-request-context="">{String(getRequestContext().mwMethod)}</p>
      <ActionsClient />
    </>
  );
}
