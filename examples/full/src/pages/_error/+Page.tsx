import { getPageContext } from "vike-react-rsc/pageContext";

// https://vike.dev/error-page
export default function Page() {
  return <h1>{getPageContext().is404 ? "Page not found" : "Something went wrong"}</h1>;
}
