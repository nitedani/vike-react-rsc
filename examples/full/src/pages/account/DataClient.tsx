"use client";
import { usePageContext } from "vike-react-rsc/pageContext";

// This page has no +data
export function DataClient() {
  return <p data-page-data>{JSON.stringify(usePageContext().data) ?? "none"}</p>;
}
