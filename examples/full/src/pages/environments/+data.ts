import type { PageContextServer } from "vike/types";
import { useConfig } from "vike-react-rsc/useConfig";

export function data(pageContext: PageContextServer) {
  const config = useConfig();
  const greetingReadBySsr = pageContext.environments?.rsc?.config.greeting;
  config({ title: `Environments: ${greetingReadBySsr}` });
  return { greetingReadBySsr };
}
