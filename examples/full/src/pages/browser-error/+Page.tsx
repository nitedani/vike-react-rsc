// Its guard() throws in the browser, so a client navigation to it shows the error page there
export default function Page() {
  return <h1>A page whose guard() throws in the browser</h1>;
}
