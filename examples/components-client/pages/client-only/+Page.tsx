"use server component";
import { useHydrated } from "vike-react-rsc/useHydrated";
import { ClientOnlyWindowWidth } from "../../components/ClientOnlyWindowWidth";

export default function Page() {
  return (
    <>
      <p id="hydrated">{useHydrated() ? "Hydrated" : "Not hydrated"}</p>
      <ClientOnlyWindowWidth />
    </>
  );
}
