"use client";
import { ClientOnly } from "vike-react-rsc/ClientOnly";
import { WindowWidth } from "./WindowWidth";

export function ClientOnlyWindowWidth() {
  return (
    <ClientOnly fallback={<p id="fallback">Loading in the browser</p>}>
      <WindowWidth />
    </ClientOnly>
  );
}
