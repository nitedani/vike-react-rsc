import { memo } from "react";
import { usePageContext } from "vike-react-rsc/usePageContext";

export default memo(function Head() {
  return <meta name="memo-head" content={usePageContext().urlPathname} />;
});
