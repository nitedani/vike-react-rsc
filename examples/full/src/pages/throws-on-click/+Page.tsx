import { ThrowsOnClick } from "./ThrowsOnClick";

export default function Page() {
  return (
    <>
      <h1>A page whose component throws on a click</h1>
      <ThrowsOnClick />
    </>
  );
}
