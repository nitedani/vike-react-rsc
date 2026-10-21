"use client";

import { rsc } from "vike-react-rsc/client";
import { AlwaysRedirectingChildComponent, AlwaysRedirectingComponent } from "../../../actions/redirectOnLoad";

const AlwaysRedirectingChildComponentRsc = rsc(AlwaysRedirectingChildComponent);
const AlwaysRedirectingComponentRsc = rsc(AlwaysRedirectingComponent);

// Loads as the page mounts, with no user action
export function LoadOnMount({ inServerFunction }: { inServerFunction: boolean }) {
  return inServerFunction ? <AlwaysRedirectingComponentRsc /> : <AlwaysRedirectingChildComponentRsc />;
}
