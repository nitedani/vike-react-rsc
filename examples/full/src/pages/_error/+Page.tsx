import { getPageContext } from "vike-react-rsc/pageContext";
import { rerenderPage } from "../../actions/rerenderPage";
import { KeyRetry } from "./KeyRetry";
import { ThrowsOnceShown } from "./ThrowsOnceShown";

// https://vike.dev/error-page
export default function Page() {
  const { is404, cookies } = getPageContext();
  if (is404) return <h1>Page not found</h1>;
  return (
    <>
      <h1>Something went wrong</h1>
      {/* On demand, while the e2e sets these cookies */}
      {cookies.has("failErrorPage") && <ThrowsOnceShown />}
      {cookies.has("keyRetry") && <KeyRetry />}
      <form action={rerenderPage}>
        <button type="submit">Try again</button>
      </form>
    </>
  );
}
