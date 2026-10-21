import { Article } from "@plugin/components/Article";

// No directive: it imports a server component through an import only a plugin resolves (vite.config.ts), so it is one too
export default function Page() {
  return <Article source="Rendered by a **server component**, through an import only a plugin resolves" />;
}
