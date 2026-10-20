import { usePageContext } from "vike-react-rsc/usePageContext";

// https://vike.dev/error-page
export default function Page() {
  return <h1 id="error-page">{usePageContext().is404 ? "Page not found" : "Something went wrong"}</h1>;
}
