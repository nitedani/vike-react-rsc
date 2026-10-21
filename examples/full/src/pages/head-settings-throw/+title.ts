// Throws in the browser, as a +title does that reads a value missing from passToClient
export default () => {
  if (typeof window !== "undefined") throw new Error("+title failed in the browser on demand");
  return "Head setting throws";
};
