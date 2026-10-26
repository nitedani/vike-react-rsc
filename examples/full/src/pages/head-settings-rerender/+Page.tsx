import { bumpDataTitle } from "../../actions/configTitle";

export default function Page() {
  return (
    <>
      <h1>Head settings after rerender()</h1>
      <form action={bumpDataTitle}>
        <button type="submit">Bump the data title</button>
      </form>
    </>
  );
}
