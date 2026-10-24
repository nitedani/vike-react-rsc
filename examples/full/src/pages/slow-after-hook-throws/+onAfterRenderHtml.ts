export function onAfterRenderHtml() {
  throw new Error("Thrown by /slow-after-hook-throws's +onAfterRenderHtml");
}
