let renders = 0;

// Vike can't send a function to the browser: there, pageContext.data throws when read
export function data() {
  const render = ++renders;
  return { getRender: () => render };
}
