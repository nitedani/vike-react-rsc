// How callServer() in the browser and the action middleware on the server talk

export const ACTION_HEADER = "x-rsc-action";
export const REDIRECT_HEADER = "x-rsc-redirect";
// The server has no action with the called id, e.g. after a deploy: the browser reloads
export const UNKNOWN_ACTION_HEADER = "x-rsc-unknown-action";
export const FLIGHT_CONTENT_TYPE = "text/x-component;charset=utf-8";
