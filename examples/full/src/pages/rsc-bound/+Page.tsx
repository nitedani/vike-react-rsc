import { BoundPagePathComponent } from "../../actions/pageData";
import { ClientBound, ServerBound } from "./Bound";

// rsc() loads a server function bound on the server and passed to a client component, and one bound in the browser
export default function Page() {
  return (
    <>
      <ServerBound load={BoundPagePathComponent.bind(null, "server-bound")} />
      <ClientBound />
    </>
  );
}
