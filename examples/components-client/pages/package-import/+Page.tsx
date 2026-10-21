import ServerBadge from "server-component-package/ServerBadge";

// No directive: it imports a package's server component, so it is one too
export default function Page() {
  return <ServerBadge label="A server component of a package" />;
}
