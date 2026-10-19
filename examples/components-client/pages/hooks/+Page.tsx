import { ClientOnly } from "vike-react-rsc/ClientOnly";
import { useData } from "vike-react-rsc/useData";
import { useHydrated } from "vike-react-rsc/useHydrated";

export default function Page() {
  const { greeting } = useData<{ greeting: string }>();
  const hydrated = useHydrated();
  return (
    <>
      <p id="data">{greeting}</p>
      <p id="hydrated">{hydrated ? "Hydrated" : "Not hydrated yet"}</p>
      <ClientOnly fallback={<p>Loading in the browser</p>}>
        <p>Rendered in the browser, at {window.location.pathname}</p>
      </ClientOnly>
    </>
  );
}
