"use server component";
import { useData } from "vike-react/useData";
import { useHydrated } from "vike-react/useHydrated";
import { usePageContext } from "vike-react/usePageContext";

export default function Page() {
  const { urlPathname } = usePageContext();
  const { greeting } = useData<{ greeting: string }>();
  return (
    <>
      <p id="server">
        {urlPathname}: {greeting}
      </p>
      <p id="hydrated">{useHydrated() ? "Hydrated" : "Not hydrated"}</p>
    </>
  );
}
