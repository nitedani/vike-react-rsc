"use server";

import { getPageContext } from "vike-react-rsc/pageContext";
import { getError } from "../pages/misuse/getError";

function PageData() {
  return <p data-rsc-page-data="">{JSON.stringify(getPageContext().data)}</p>;
}

// Loaded with rsc(): the server component it returns reads the data() of the page that loads it
export async function PageDataComponent() {
  return <PageData />;
}

// Loaded with rsc(): it runs as a server action, which has no page
export async function PageContextErrorComponent() {
  return <p data-rsc-page-context="">{getError(getPageContext)}</p>;
}

function PageContextError() {
  return <p data-returned-page-context="">{getError(getPageContext)}</p>;
}

// Called without rsc() or rerender(): the server component it returns renders without the page's guard() and data()
export async function returnPageContextError() {
  return <PageContextError />;
}
