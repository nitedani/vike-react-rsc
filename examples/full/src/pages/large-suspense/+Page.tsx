import { Suspense } from "react";

// More than React's default chunk size of 12,800 bytes, which React would otherwise show later with a script
async function Large() {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return <p id="large">{"Large content ".repeat(1500)}</p>;
}

// Without +stream: rendered whole, pre-rendered too
export default function Page() {
  return (
    <Suspense fallback={<p>Loading</p>}>
      <Large />
    </Suspense>
  );
}
