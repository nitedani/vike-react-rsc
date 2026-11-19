import { getPageContext } from "vike-react-rsc/pageContext";
import { rerenderPage } from "../../actions/rerenderPage";

// https://vike.dev/error-page
export default function Page() {
  if (getPageContext().is404) return <h1>Page not found</h1>;
  return (
    <>
      <h1>Something went wrong</h1>
      <form action={rerenderPage}>
        <button type="submit">Try again</button>
      </form>
    </>
  );
}
