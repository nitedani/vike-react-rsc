import { renderAgain } from "../../actions/renderAgain";
import { increment } from "../../serverCounts";

export default function Page() {
  return (
    <>
      <h1>Head settings emptied</h1>
      <p data-render-count="">Rendered {increment("head-settings-empty")} times</p>
      <form action={renderAgain}>
        <button type="submit">Render again</button>
      </form>
    </>
  );
}
