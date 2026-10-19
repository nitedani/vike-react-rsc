"use server component";
import { ClientOnly } from "vike-react-rsc/ClientOnly";
import { useHydrated } from "vike-react-rsc/useHydrated";
import { Counter } from "../../components/Counter";

export default function Page() {
  return (
    <>
      <p id="hydrated">{useHydrated() ? "Hydrated" : "Not hydrated"}</p>
      <ClientOnly fallback={<p id="fallback">Loading in the browser</p>}>
        <Counter />
      </ClientOnly>
    </>
  );
}
