"use server component";
import { useData } from "vike-react-rsc/useData";
import { usePageContext } from "vike-react-rsc/usePageContext";
import { ClientPageInfo } from "../../components/ClientPageInfo";
import { PageInfo } from "../../components/PageInfo";

export default async function Page() {
  await Promise.resolve();
  const { urlPathname } = usePageContext();
  const { greeting } = useData<{ greeting: string }>();
  return (
    <>
      <p id="async-server">
        {urlPathname}: {greeting}
      </p>
      <PageInfo id="shared-server" />
      <ClientPageInfo />
    </>
  );
}
