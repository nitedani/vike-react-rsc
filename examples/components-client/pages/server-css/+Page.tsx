"use server component";
import { Counter } from "../../components";
import "./server-css.css";

export default async function Page() {
  return (
    <>
      <p id="server-css" className="server-css">
        A server page that imports CSS
      </p>
      <Counter />
    </>
  );
}
