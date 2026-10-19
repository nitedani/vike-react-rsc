"use client";

import { usePageContext } from "vike-react-rsc/pageContext";
import { renderAgain } from "../../actions/renderAgain";

export function UnserializableClient() {
  const page = Number(usePageContext().urlParsed.search.page);
  return (
    <>
      <a href={`/unserializable?page=${page + 1}`}>Next page</a>
      <button onClick={() => renderAgain()}>Render again</button>
    </>
  );
}
