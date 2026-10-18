import type { PageContext } from "vike/types";

export default (pageContext: PageContext<{ title: string }>) => pageContext.data.title;
