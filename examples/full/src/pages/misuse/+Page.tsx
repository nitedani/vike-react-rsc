import { getPageContext } from "vike-react-rsc/pageContext";
import { getResponseHeaders, rerender } from "vike-react-rsc/server";

function getError(call: () => unknown): string {
  try {
    call();
    return "No error";
  } catch (error) {
    return (error as Error).message;
  }
}

// Evaluated when this module loads, before anything renders
const getPageContextError = getError(getPageContext);

// What each call throws where it can't work
export default function Page() {
  return (
    <ul>
      <li data-misuse="getPageContext">{getPageContextError}</li>
      <li data-misuse="rerender">{getError(rerender)}</li>
      <li data-misuse="getResponseHeaders">{getError(getResponseHeaders)}</li>
    </ul>
  );
}
