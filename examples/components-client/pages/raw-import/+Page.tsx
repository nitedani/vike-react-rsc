import { useState } from "react";
import markdownSource from "../../components/Markdown.tsx?raw";
import markdownUrl from "../../components/Markdown.tsx?url";

// Its imports of a server component's file give its text and its URL, not the module: the page stays a client component
export default function Page() {
  const [clicks, setClicks] = useState(0);
  return (
    <>
      <h1>A page that shows a server component's source</h1>
      <a href={markdownUrl}>
        <pre id="raw-import-source">{markdownSource.split("\n")[0]}</pre>
      </a>
      <button id="raw-import-counter" onClick={() => setClicks(clicks + 1)}>
        Clicked {clicks} times
      </button>
    </>
  );
}
