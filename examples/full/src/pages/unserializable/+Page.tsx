import { getPageContext } from "vike-react-rsc/pageContext";
import { UnserializableClient } from "./UnserializableClient";

export default function Page() {
  const pageContext = getPageContext();
  const { getRender } = pageContext.data as { getRender: () => number };
  // Pre-rendered without a query
  const page = Number(pageContext.urlParsed.search.page ?? 1);
  return (
    <>
      <h1>A function in data</h1>
      <p data-page="">{page}</p>
      <p data-render="">{getRender()}</p>
      <UnserializableClient page={page} />
    </>
  );
}
