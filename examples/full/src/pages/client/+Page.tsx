"use client";

import { useState } from "react";
import { usePageContext } from "vike-react-rsc/pageContext";

export const Page = () => {
  useState(0);
  const { urlPathname } = usePageContext();
  return (
    <>
      <div>Client Component</div>
      <p data-url-pathname="">{urlPathname}</p>
    </>
  );
};
