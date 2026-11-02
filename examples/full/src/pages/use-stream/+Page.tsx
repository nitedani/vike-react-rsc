import { InnerCounter } from "client-component-package";
import { ClientCounter } from "client-component-package/ClientCounter";
import { StreamInjection } from "./StreamInjection";

export default function Page() {
  return (
    <>
      <StreamInjection />
      <ClientCounter />
      <InnerCounter />
    </>
  );
}
