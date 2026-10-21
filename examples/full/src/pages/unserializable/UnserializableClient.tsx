"use client";

import { renderAgain } from "../../actions/renderAgain";

export function UnserializableClient({ page }: { page: number }) {
  return (
    <>
      <a href={`/unserializable?page=${page + 1}`}>Next page</a>
      <button onClick={() => renderAgain()}>Render again</button>
    </>
  );
}
