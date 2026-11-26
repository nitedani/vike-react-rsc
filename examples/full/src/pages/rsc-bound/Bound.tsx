"use client";

import { useMemo, type ReactNode } from "react";
import { rsc } from "vike-react-rsc/client";
import { BoundPagePathComponent } from "../../actions/pageData";

const ClientBoundRsc = rsc(BoundPagePathComponent.bind(null, "client-bound"));

export function ClientBound() {
  return <ClientBoundRsc />;
}

export function ServerBound({ load }: { load: (props: object) => Promise<ReactNode> }) {
  const ServerBoundRsc = useMemo(() => rsc(load), [load]);
  return <ServerBoundRsc />;
}
