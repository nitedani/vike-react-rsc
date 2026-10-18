import { getPageContext } from "vike-react-rsc/pageContext";

// Also shown at /abort/rewrite, by its Page's `throw render("/abort/reason", …)`
export default function Page() {
  return <p id="abort-reason">{String(getPageContext().abortReason)}</p>;
}
