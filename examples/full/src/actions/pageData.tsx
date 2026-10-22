"use server";

import { getPageContext } from "vike-react-rsc/pageContext";

function PageData() {
  return <p data-rsc-page-data="">{JSON.stringify(getPageContext().data)}</p>;
}

// Loaded with rsc(): the server component it returns reads the data() of the page that loads it
export async function PageDataComponent() {
  return <PageData />;
}
