import type { Config } from "vike/types";

export default ((pageContext) => ({ hydrateRootOptions: { formState: pageContext.restoredFormState } })) satisfies Config["react"];
