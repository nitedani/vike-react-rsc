"use server component";
import { getPageContext } from "vike-react-rsc/pageContext";

export default function Page() {
  const { store } = getPageContext();
  store?.renderedBy.push("Page");
  return <p id="store">{store?.greeting}</p>;
}
