import { usePageContext } from "vike-react-rsc/usePageContext";

// As vike-react-query's withFallback(), whose fallback is +Loading's component unless it's given one
export default function Page() {
  const Loading = usePageContext().config.Loading?.component;
  return <div id="default-loading">{Loading ? <Loading /> : "No Loading.component"}</div>;
}
