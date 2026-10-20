import { Article } from "../../components/Article";
import { Counter } from "../../components/Counter";

// No directive: it imports a server component through Article.tsx, so it is one too
export default function Page() {
  const where = typeof window === "undefined" ? "server" : "browser";
  return (
    <>
      <h1>A page that imports a server component</h1>
      <p id="rendered-on">Rendered on the {where}</p>
      <Article source="Rendered by a **server component**, through a file without a directive" />
      <Counter />
    </>
  );
}
