import { Leaf } from "../../components/Leaf";

export default function Page() {
  return (
    <>
      <p id="hmr">Rendered by a client component</p>
      <Leaf />
    </>
  );
}
