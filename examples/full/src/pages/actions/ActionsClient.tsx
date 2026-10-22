"use client";

import { useActionState, useState, type ReactNode } from "react";
import { rsc } from "vike-react-rsc/client";
import { countSubmit, FailingComponent, loginThenRender, readRequestContext, RedirectOnceComponent, redirectToScript, requireLogin, save, saveThenGuard404, saveThenRedirectPage, slowSave } from "../../actions/edgeCases";
import { PageDataComponent, returnPageContextError } from "../../actions/pageData";
import { RedirectingChildComponent } from "../../actions/redirectingChild";

const FailingComponentRsc = rsc(FailingComponent);
const RedirectOnceComponentRsc = rsc(RedirectOnceComponent);
const RedirectingChildComponentRsc = rsc(RedirectingChildComponent);
const PageDataComponentRsc = rsc(PageDataComponent);

export default function ActionsClient() {
  const [result, setResult] = useState("");
  const [showFailing, setShowFailing] = useState(false);
  const [showRedirecting, setShowRedirecting] = useState(false);
  const [showPageData, setShowPageData] = useState(false);
  const [returned, setReturned] = useState<ReactNode>(null);
  const [firstRedirect, setFirstRedirect] = useState<"child" | "server-function">();
  const [submits, countSubmitAction] = useActionState(countSubmit, 0);
  const call = (action: () => Promise<string>) => async () => {
    let message: string;
    try {
      message = `Returned: ${await action()}`;
    } catch (error) {
      message = `Rejected: ${(error as Error).message}`;
    }
    // Also logged: the caller may have navigated away before the action returned
    console.log(message);
    setResult(message);
  };
  return (
    <>
      <button onClick={call(save)}>Save</button>
      <button onClick={call(saveThenGuard404)}>Save, then guard() throws render(404)</button>
      <button onClick={call(saveThenRedirectPage)}>Save, then the page throws redirect()</button>
      <button onClick={call(slowSave)}>Slow save</button>
      <button onClick={call(redirectToScript)}>Redirect to a javascript: URL</button>
      <button onClick={call(requireLogin)}>Require a login</button>
      <button onClick={call(loginThenRender)}>Log in, then render the account</button>
      <button onClick={call(readRequestContext)}>Read the request context</button>
      <p data-result="">{result}</p>
      <button onClick={() => setShowFailing(true)}>Load a failing server component</button>
      {showFailing && <FailingComponentRsc fallback={<p data-rsc-fallback="">Not loaded</p>} />}
      <button onClick={() => setShowRedirecting(true)}>Load a redirecting server component</button>
      <p data-rsc-redirecting="">{showRedirecting && <RedirectOnceComponentRsc fallback="Not loaded" />}</p>
      <button onClick={() => setShowPageData(true)}>Load a server component that reads data()</button>
      {showPageData && <PageDataComponentRsc />}
      <button onClick={async () => setReturned(await returnPageContextError())}>Return a server component that calls getPageContext()</button>
      {returned}
      <button onClick={() => setFirstRedirect("child")}>Load a server component whose child redirects</button>
      <button onClick={() => setFirstRedirect("server-function")}>Load a server component that redirects, then ones whose child redirects</button>
      {firstRedirect && (
        <>
          <RedirectingChildComponentRsc first={firstRedirect} />
          {/* Answer after the first one's redirect: one before Back, the other still loading when the page shows them again */}
          <RedirectingChildComponentRsc first={firstRedirect} delay={1000} />
          <RedirectingChildComponentRsc first={firstRedirect} delay={3000} />
        </>
      )}
      <form action={countSubmitAction}>
        <input type="file" name="attachment" />
        <button type="submit">Count a submit</button>
      </form>
      <form>
        <input type="file" name="attachment" />
        <button formAction={countSubmitAction}>Count via formAction</button>
      </form>
      <p data-submits="">Submitted {submits} times</p>
    </>
  );
}
