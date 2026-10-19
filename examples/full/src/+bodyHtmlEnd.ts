import { getPageContext } from "vike/getPageContext";

// Reads getPageContext(), as vike-react allows; every page's HTML has it, see testHeadSettings()
export default () => `<!-- bodyHtmlEnd ${getPageContext()?.urlPathname} -->`;
