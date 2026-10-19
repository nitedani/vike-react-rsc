"use server component";
import { SpaControls } from "../../components/SpaControls";

let renders = 0;

export default async function Page() {
  const where = await Promise.resolve(typeof window === "undefined" ? "server" : "browser");
  renders++;
  return (
    <>
      <h1>A page without HTML, with a server component</h1>
      <p id="spa-rendered-on">Rendered on the {where}</p>
      <p id="spa-renders">{renders}</p>
      <SpaControls />
    </>
  );
}
