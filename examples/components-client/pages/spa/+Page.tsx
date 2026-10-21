export default function Page() {
  return <p id="spa">Rendered in the browser, after onBeforeRenderClient() for {(window as { renderedPath?: string }).renderedPath}</p>;
}
