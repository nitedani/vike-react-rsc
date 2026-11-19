import { getPageContext } from "vike-react-rsc/pageContext";
import { logout } from "../../actions/session";
import { sharedStyles } from "../../styles/shared";
import { DataClient } from "./DataClient";

export default function Page() {
  return (
    <div css={sharedStyles.pageContainer}>
      <h1 css={sharedStyles.mainHeading}>Account</h1>
      <p id="account-user" css={sharedStyles.paragraph}>
        Logged in as {getPageContext().cookies.get("session")}
      </p>
      <p id="account-mw" css={sharedStyles.paragraph}>
        {getPageContext().mwMethod}
      </p>
      <DataClient />
      <form action={logout}>
        <button type="submit">Log out</button>
      </form>
    </div>
  );
}
