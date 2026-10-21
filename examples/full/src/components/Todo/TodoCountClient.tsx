"use client";

import { Suspense, use } from "react";
import { usePageContext } from "vike-react-rsc/pageContext";
import { sharedStyles } from "../../styles/shared";

type Data = { todoCount: number; todoCountStreamed: Promise<{ todoCount: number }> };

export default function TodoCountClient() {
  const pageContext = usePageContext();
  const { todoCount, todoCountStreamed } = pageContext.data as Data;
  // From globalContext, which pageContext also answers
  const { appName } = pageContext as { appName?: string };
  return (
    <>
      <p id="todo-count-client" css={sharedStyles.paragraph}>
        A client component of {appName} reads the same {todoCount} tasks from <code>usePageContext().data</code>
      </p>
      <Suspense>
        <TodoCountStreamed todoCountStreamed={todoCountStreamed} />
      </Suspense>
    </>
  );
}

function TodoCountStreamed({ todoCountStreamed }: Pick<Data, "todoCountStreamed">) {
  return (
    <p id="todo-count-streamed" css={sharedStyles.paragraph}>
      It awaits {use(todoCountStreamed).todoCount} tasks streamed in <code>data</code>
    </p>
  );
}
