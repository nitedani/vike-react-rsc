// Slow, so a navigation keeps the previous page on screen for a while
export default async function Page() {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return <h1>Head settings</h1>;
}
