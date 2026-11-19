"use client";

import { rerenderPage } from "../../actions/rerenderPage";

export function UnserializableClient({ page }: { page: number }) {
  return (
    <>
      <a href={`/unserializable?page=${page + 1}`}>Next page</a>
      <button onClick={() => rerenderPage()}>Render again</button>
    </>
  );
}
