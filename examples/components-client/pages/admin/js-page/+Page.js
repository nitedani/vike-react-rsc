import { createElement, useState } from "react";

// A vike-react page written without JSX
export default function Page() {
  const [clicks, setClicks] = useState(0);
  return createElement("button", { id: "js-counter", onClick: () => setClicks(clicks + 1) }, `JS counter ${clicks}`);
}
