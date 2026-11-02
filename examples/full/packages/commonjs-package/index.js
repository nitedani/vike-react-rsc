const { createElement } = require("react");
// Its module.exports is a function, as react-device-detect's ua-parser-js
const ms = require("ms");

exports.Greeting = function Greeting() {
  return createElement("p", null, `Hello from a CommonJS package in ${ms(60000)}`);
};
