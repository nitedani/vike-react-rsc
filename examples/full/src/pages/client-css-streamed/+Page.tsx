import { StyledClient } from "../client-css/StyledClient";

// Loading.layout shows until the await is over, so StyledClient renders after React's shell
export default async function Page() {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return (
    <>
      <h1>Client CSS, streamed</h1>
      <StyledClient />
    </>
  );
}
