import { Suspense } from "react";
import { Config } from "vike-react-rsc/Config";

export default function Page() {
  return (
    <>
      <h1>Config behind Suspense</h1>
      <Suspense>
        <Title />
      </Suspense>
    </>
  );
}

// Renders after the <head>, unless the page is pre-rendered
async function Title() {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return <Config title="Config behind Suspense" />;
}
