import { useData } from "vike-react-rsc/useData";
import { usePageContext } from "vike-react-rsc/usePageContext";

// Rendered by a server component and by a "use client" file, so it runs on the server and in the browser
export function PageInfo({ id }: { id: string }) {
  const { urlPathname } = usePageContext();
  const { greeting } = useData<{ greeting: string }>();
  return (
    <p id={id}>
      {urlPathname}: {greeting}
    </p>
  );
}
