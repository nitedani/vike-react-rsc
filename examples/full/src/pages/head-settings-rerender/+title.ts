import type { PageContext } from "vike/types";

export default (pageContext: PageContext<{ bumps: number }>) => `Data title, bumped ${pageContext.data.bumps} times`;
