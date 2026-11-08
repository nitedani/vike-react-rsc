// The package root, as vike-react has it: tsconfig's `"types": ["vike-react"]` loads the config's types from it
console.warn(
  "[vike-react-rsc][warning] Replace `import vikeReact from 'vike-react'` with `import vikeReactRsc from 'vike-react-rsc/config'` (typically in your /pages/+config.js)"
);
export { default } from "./config";
