// A Loading's layout from a package with a react-server export, by an import string in the value, which Config's type doesn't take
export default {
  Loading: { layout: "import:react-server-layout/Loading:default" },
  // testLoading(): the Loading streams before the page
  stream: true,
};
