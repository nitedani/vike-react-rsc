"use client";

import { useState } from "react";
import { usePageContext } from "vike-react-rsc/pageContext";
import { rerenderPage } from "../../actions/rerenderPage";

export const Page = () => {
  useState(0);
  const { urlPathname, visitor } = usePageContext();
  return (
    <>
      <div>Client Component</div>
      <p data-url-pathname="">{urlPathname}</p>
      <p data-visitor="">{visitor ?? "none"}</p>
      <button onClick={() => rerenderPage()}>Render again</button>
    </>
  );
};
