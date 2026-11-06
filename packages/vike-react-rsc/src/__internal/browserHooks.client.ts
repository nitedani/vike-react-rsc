// The `.client` file name keeps this onCreatePageContext hook in the browser: Vike still counts ssr.server's as server-only,
// so that a navigation fetches its rscPayload
export { throwLateError } from "../browser/page";
