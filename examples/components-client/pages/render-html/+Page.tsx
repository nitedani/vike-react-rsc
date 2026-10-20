"use server component";
import { getPageContext } from "vike-react-rsc/pageContext";

export default function Page() {
  return <p id="store">{getPageContext().store?.greeting}</p>;
}
