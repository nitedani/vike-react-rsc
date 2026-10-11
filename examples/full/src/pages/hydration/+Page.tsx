import { HydrationClient } from "./HydrationClient";

export default function Page() {
  return (
    <>
      <h1>Hydration without Loading.layout</h1>
      <HydrationClient />
    </>
  );
}
