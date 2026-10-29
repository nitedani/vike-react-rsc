import { usePageContext } from "vike-react-rsc/usePageContext";

export default function Head() {
  return <meta name="store-greeting" content={usePageContext().store?.greeting} />;
}
