"use server component";
import { Counter } from "../../components";
import "../server-css/server-css.css";

export async function Page() {
  return (
    <>
      <p id="server-css" className="server-css">
        A server page that imports CSS, exported as Page
      </p>
      <Counter />
    </>
  );
}
