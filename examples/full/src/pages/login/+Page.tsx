import { login } from "../../actions/session";
import { sharedStyles } from "../../styles/shared";

// Also shown at /account, by its guard's `throw render("/login")`
export default function Page() {
  return (
    <div css={sharedStyles.pageContainer}>
      <h1 css={sharedStyles.mainHeading}>Log in</h1>
      <form action={login}>
        <input name="user" defaultValue="alice" />
        <button type="submit">Log in</button>
      </form>
    </div>
  );
}
