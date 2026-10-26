import { requireLogin, showConfigPage } from "../../actions/edgeCases";

// Slow, so a navigation keeps the previous page on screen for a while
export default async function Page() {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return (
    <>
      <h1>Head settings</h1>
      <form action={requireLogin}>
        <button type="submit">Require a login</button>
      </form>
      <form action={showConfigPage}>
        <button type="submit">Show the Config page</button>
      </form>
    </>
  );
}
