// E.g. a hook that awaits a service, longer than /slow-client's Suspense boundary waits
export async function onAfterRenderHtml() {
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
