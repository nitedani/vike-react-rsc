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

function PageContextError() {
  return <p data-returned-page-context="">{getError(getPageContext)}</p>;
}

// Called without rsc() or rerender(): the server component it returns renders without the page's guard() and data()
export async function returnPageContextError() {
  return <PageContextError />;
}
