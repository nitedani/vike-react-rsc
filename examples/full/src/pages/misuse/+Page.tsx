import { getPageContext } from "vike-react-rsc/pageContext";
import { rerender } from "vike-react-rsc/server";
import { getError } from "./getError";

// Evaluated when this module loads, before anything renders
const getPageContextError = getError(getPageContext);

// What each call throws where it can't work
export default function Page() {
  const data = getPageContext().data as { rerender: string; setCookie: string; cookieSeen: string };
  return (
    <ul>
      <li data-misuse="getPageContext">{getPageContextError}</li>
      <li data-misuse="rerender">{getError(rerender)}</li>
      <li data-misuse="data:rerender">{data.rerender}</li>
      <li data-misuse="setCookie">{getError(() => getPageContext().cookies.set("misuse", "1"))}</li>
      <li data-misuse="data:setCookie">{data.setCookie}</li>
      <li data-misuse="data:cookieSeen">{data.cookieSeen}</li>
    </ul>
  );
}
