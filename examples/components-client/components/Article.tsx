import { Markdown } from "./Markdown";

export function Article({ source }: { source: string }) {
  return (
    <article>
      <Markdown source={source} />
    </article>
  );
}
