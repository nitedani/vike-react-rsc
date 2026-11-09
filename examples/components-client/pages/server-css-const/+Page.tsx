"use server component";
import { Counter } from "../../components";
import "../server-css/server-css.css";

const Page = async () => (
  <>
    <p id="server-css" className="server-css">
      A server page that imports CSS, exported from a constant
    </p>
    <Counter />
  </>
);
export default Page;
