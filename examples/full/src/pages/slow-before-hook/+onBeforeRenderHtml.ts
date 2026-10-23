// E.g. a hook that awaits a service, longer than /slow's Suspense boundary waits
export async function onBeforeRenderHtml() {
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
