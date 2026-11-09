import "./server.css";
import { ClientFont } from "./ClientFont";

export default function Page() {
  return (
    <>
      <h1 data-server-font="">Fonts</h1>
      <ClientFont />
    </>
  );
}
