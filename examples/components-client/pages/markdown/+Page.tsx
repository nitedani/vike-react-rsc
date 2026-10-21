"use server component";
import { Markdown } from "../../components/Markdown";

export default function Page() {
  return <Markdown source="Rendered by a **server component** that a server page imports" />;
}
