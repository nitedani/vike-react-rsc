// How the browser and the server talk, besides Vike's page loads and navigations:
// - a server action: a POST to the page's URL with ACTION_HEADER, answered with Flight, REDIRECT_HEADER or UNKNOWN_ACTION_HEADER
// - an rsc() load: a server action that also sends RSC_LOAD_HEADER
// - a redirect a server component throws once the HTML has started: a refresh <meta> with REDIRECT_META_ATTRIBUTE,
//   written only for an http(s) URL

export const ACTION_HEADER = "x-rsc-action";
export const REDIRECT_HEADER = "x-rsc-redirect";
// Sent by rsc(): the server components it loads read the page's pageContext, so guard() and data() run for them
export const RSC_LOAD_HEADER = "x-rsc-load";
// The server has no action with the called id, e.g. after a deploy: the browser reloads
export const UNKNOWN_ACTION_HEADER = "x-rsc-unknown-action";
export const FLIGHT_CONTENT_TYPE = "text/x-component;charset=utf-8";
// The browser leaves it to the <meta> to redirect
export const REDIRECT_META_ATTRIBUTE = "data-vike-react-rsc-redirect";
