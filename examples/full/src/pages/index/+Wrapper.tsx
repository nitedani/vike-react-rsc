import { getPageContext } from "vike-react-rsc/pageContext";
import { increment } from "../../serverCounts";

// Wraps the page, outside its Layout
export default function Wrapper({ children }: { children: React.ReactNode }) {
  increment(`render ${getPageContext().urlPathname}`);
  return <div data-wrapper="">{children}</div>;
}
