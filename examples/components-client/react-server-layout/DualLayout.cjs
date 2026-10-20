const { createElement } = require("react");

// What the package gives require()
module.exports = function DualLayout({ children }) {
  return createElement("div", null, createElement("p", { id: "npm-dual-layout-counter" }, "The require file of a dual layout"), children);
};
