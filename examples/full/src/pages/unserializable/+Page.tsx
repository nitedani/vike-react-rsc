import { getPageContext } from "vike-react-rsc/pageContext";
import { UnserializableClient } from "./UnserializableClient";

export default function Page() {
  const pageContext = getPageContext();
  const { getRender } = pageContext.data as { getRender: () => number };
  return (
    <>
      <h1>A function in data</h1>
      <p data-page="">{pageContext.urlParsed.search.page}</p>
      <p data-render="">{getRender()}</p>
      <UnserializableClient />
    </>
  );
}
