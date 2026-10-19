// How callServer() in the browser and the action middleware on the server talk

export const ACTION_HEADER = "x-rsc-action";
export const REDIRECT_HEADER = "x-rsc-redirect";
// The server has no action with the called id, e.g. after a deploy: the browser reloads
export const UNKNOWN_ACTION_HEADER = "x-rsc-unknown-action";
export const FLIGHT_CONTENT_TYPE = "text/x-component;charset=utf-8";
// Stands for a promise or stream among the pageContext values rerender() sends, followed by its index among the values
// Flight carries. The serializer escapes a user string that starts with "!", so no string looks like it.
export const STREAMED_MARKER = "!vike-react-rsc:";
