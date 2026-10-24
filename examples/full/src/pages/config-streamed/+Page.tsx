import { Config } from "vike-react-rsc/Config";
import { Head } from "vike-react-rsc/Head";

export default function Page() {
  return (
    <>
      <Config title="Config on a streamed page" />
      <Head>
        <meta name="use-config" content="Head on a streamed page" />
      </Head>
      <h1>Config on a streamed page</h1>
    </>
  );
}
