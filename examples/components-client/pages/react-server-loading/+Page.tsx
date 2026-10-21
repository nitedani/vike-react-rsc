"use server component";

export default async function Page() {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return <p id="loaded">A server page that waits for its data</p>;
}
