import { createElement, Fragment } from "react";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";

// As a vike-react extension's Wrapper reads the page, e.g. vike-react-query's
export default function Wrapper({ children }) {
  const { urlPathname } = usePageContext();
  const { greeting } = useData();
  return createElement(Fragment, null, createElement("p", { id: "wrapper" }, `${urlPathname}: ${greeting}`), children);
}
