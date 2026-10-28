export function onBeforeRenderHtml() {
  throw new Error("Thrown by /slow-hook-throws's +onBeforeRenderHtml");
}
