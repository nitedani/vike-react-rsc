// The `.server` file name keeps onCreatePageContext on the server, so that a navigation fetches its rscPayload there
export { onCreatePageContext } from "../ssr/onCreatePageContext";
export { onRenderHtml } from "../integration/onRenderHtml";
