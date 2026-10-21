import { getPageContext } from "vike-react-rsc/pageContext";

// Also shown at /abort/rewrite, by its Page's `throw render("/abort/reason", …)`
export default function Page() {
  const { message, at } = getPageContext().abortReason as { message: string; at: Date };
  return <p id="abort-reason">{`${message}, at ${at.toISOString()}`}</p>;
}
