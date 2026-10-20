"use server component";
import { Suspense } from "react";
import { getPageContext } from "vike-react-rsc/pageContext";
import { getStore } from "./getStore";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Renders while +onAfterRenderHtml awaits
async function Writes() {
  await sleep(200);
  getPageContext().written = "Written by a server component";
  return <p id="deferred-store">{getStore().greeting}</p>;
}

// Renders once +onAfterRenderHtml is done
async function Reads() {
  await sleep(1200);
  return (
    <>
      <p id="deferred-write">{getPageContext().written}</p>
      <p id="deferred-getter">{getPageContext().writtenLater}</p>
    </>
  );
}

export default function Page() {
  // Runs when read, so it gives what Writes sets later
  Object.defineProperty(getPageContext(), "writtenLater", {
    get(this: Vike.PageContext) {
      return this.written;
    },
    configurable: true,
  });
  return (
    <>
      <p id="server-store">{getStore().greeting}</p>
      <p id="same-store">{String(getStore() === getStore())}</p>
      <p id="locale">{getPageContext().localeLabel}</p>
      <p id="components">{getPageContext().componentsLabel}</p>
      <p id="has-user">{String("user" in getPageContext())}</p>
      <Suspense fallback={null}>
        <Writes />
      </Suspense>
      <Suspense fallback={null}>
        <Reads />
      </Suspense>
    </>
  );
}
