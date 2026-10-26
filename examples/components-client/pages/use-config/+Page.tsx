import { Head } from "vike-react-rsc/Head";
import { useConfig } from "vike-react-rsc/useConfig";

export default function Page() {
  useConfig()({ title: "useConfig() in a client component" });
  return (
    <>
      <Head>
        <meta name="use-config" content="Head in a client component" />
      </Head>
      <h1>useConfig()</h1>
    </>
  );
}
