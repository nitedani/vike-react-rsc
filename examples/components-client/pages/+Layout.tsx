import { useState, type ReactNode } from "react";
import { usePageContext } from "vike-react-rsc/pageContext";

export default function Layout({ children }: { children: ReactNode }) {
  const [clicks, setClicks] = useState(0);
  const { urlPathname } = usePageContext();
  return (
    <>
      <nav>
        <a href="/">Home</a> <a href="/server">Server</a> <a href="/admin">Admin</a>
      </nav>
      <button id="layout-counter" onClick={() => setClicks(clicks + 1)}>
        Layout {clicks}
      </button>
      <p id="pathname">{urlPathname}</p>
      <main>{children}</main>
    </>
  );
}
