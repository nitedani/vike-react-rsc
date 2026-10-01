import { getPageContext } from "vike-react-rsc/pageContext";
import { sharedStyles } from "../../styles/shared";

// A server component: runs in the rsc environment
export default function Page() {
  const pageContext = getPageContext();
  const { greetingReadBySsr } = pageContext.data as { greetingReadBySsr: string };
  return (
    <div css={sharedStyles.pageContainer}>
      <h1 css={sharedStyles.mainHeading}>Vike environments</h1>
      <p css={sharedStyles.paragraph}>
        Server component (rsc) reads <code>config.greeting</code>:{" "}
        <strong id="greeting-rsc">{pageContext.config.greeting}</strong>
      </p>
      <p css={sharedStyles.paragraph}>
        +data (ssr) read <code>config.greeting</code>:{" "}
        <strong id="greeting-ssr">{greetingReadBySsr}</strong>
      </p>
    </div>
  );
}
