// The `.ssr` file name: Vike runs this onCreatePageContext hook only to render the HTML, so a navigation doesn't fetch the
// page's pageContext for it
export { onCreatePageContext } from "../ssr/onCreatePageContext";
