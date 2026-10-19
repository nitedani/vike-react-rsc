"use server component";

export async function Markdown({ source }: { source: string }) {
  const html = await Promise.resolve(source.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>"));
  return <div id="markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}
