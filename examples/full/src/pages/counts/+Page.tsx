import { getPageContext } from "vike-react-rsc/pageContext";
import { getCounts, releaseHeldWaits } from "../../serverCounts";

export default function Page() {
  if ("release" in getPageContext().urlParsed.search) releaseHeldWaits();
  return (
    <ul>
      {Object.entries(getCounts()).map(([key, count]) => (
        <li key={key} data-count={key}>
          {count}
        </li>
      ))}
    </ul>
  );
}
