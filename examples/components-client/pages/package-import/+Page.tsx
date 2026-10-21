import { ServerBadge } from "server-component-wrapper";

// No directive: it imports a package's server component, through a package that re-exports it, so it is one too
export default function Page() {
  return <ServerBadge label="A server component of a package" />;
}
