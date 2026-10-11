import { getPageContext } from "vike-react-rsc/pageContext";
import { getResponseHeaders, rerender } from "vike-react-rsc/server";
import { getError } from "./getError";

// Evaluated when this module loads, before anything renders
const getPageContextError = getError(getPageContext);

// What each call throws where it can't work
export default function Page() {
  const data = getPageContext().data as { rerender: string; getResponseHeaders: string };
  return (
    <ul>
      <li data-misuse="getPageContext">{getPageContextError}</li>
      <li data-misuse="rerender">{getError(rerender)}</li>
      <li data-misuse="getResponseHeaders">{getError(getResponseHeaders)}</li>
      <li data-misuse="data:rerender">{data.rerender}</li>
      <li data-misuse="data:getResponseHeaders">{data.getResponseHeaders}</li>
    </ul>
  );
}
