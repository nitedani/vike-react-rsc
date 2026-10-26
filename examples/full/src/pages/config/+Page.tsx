import { Config } from "vike-react-rsc/Config";
import { Head } from "vike-react-rsc/Head";
import { bumpConfigTitle } from "../../actions/configTitle";
import { getCounts } from "../../serverCounts";

export default function Page() {
  const bumps = getCounts().configTitle ?? 0;
  return (
    <>
      <Config title={`Config in a server component, bumped ${bumps} times`} />
      <Head>
        <meta name="use-config" content="Head in a server component" />
      </Head>
      <h1>Config</h1>
      <form action={bumpConfigTitle}>
        <button type="submit">Bump the title</button>
      </form>
    </>
  );
}
