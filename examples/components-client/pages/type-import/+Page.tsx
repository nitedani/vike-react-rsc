import { useState } from "react";
import { Markdown } from "../../components/Markdown";

// Its import of a server component names only a type, which TypeScript drops without verbatimModuleSyntax (./tsconfig.json),
// so the browser never loads it: the page stays a client component
export default function Page() {
  const [clicks, setClicks] = useState(0);
  const label: Parameters<typeof Markdown>[0]["source"] = `Clicked ${clicks} times`;
  return (
    <>
      <h1>A page that imports a type from a server component</h1>
      <button id="type-import-counter" onClick={() => setClicks(clicks + 1)}>
        {label}
      </button>
    </>
  );
}
