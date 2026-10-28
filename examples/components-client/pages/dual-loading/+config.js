// A Loading's layout from a package whose export has an import file and a require file, by an import string in the value
export default {
  Loading: { layout: "import:react-server-layout/DualLayout:default" },
  // testLoading(): the Loading streams before the page
  stream: true,
};
