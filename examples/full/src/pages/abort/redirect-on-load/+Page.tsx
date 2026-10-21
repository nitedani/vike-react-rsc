import { getPageContext } from "vike-react-rsc/pageContext";
import { LoadOnMount } from "./LoadOnMount";

// ?in=server-function: the server function throws redirect(), else a server component it renders does
export default function Page() {
  const { in: thrower } = getPageContext().urlParsed.search;
  return (
    <>
      <h1>Redirect from what the page loads on mount</h1>
      <LoadOnMount inServerFunction={thrower === "server-function"} />
    </>
  );
}
