"use server component";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";

export default function Page() {
  const { urlPathname } = usePageContext();
  const { greeting } = useData<{ greeting: string }>();
  return (
    <p id="server">
      {urlPathname}: {greeting}
    </p>
  );
}
