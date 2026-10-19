"use client";

import { Suspense, use } from "react";
import { usePageContext } from "vike-react-rsc/pageContext";
import { sharedStyles } from "../../styles/shared";

type Data = { todoCount: number; todoCountStreamed: Promise<{ todoCount: number }> };

export default function TodoCountClient() {
  const { todoCount, todoCountStreamed } = usePageContext().data as Data;
  return (
    <>
      <p id="todo-count-client" css={sharedStyles.paragraph}>
        A client component reads the same {todoCount} tasks from <code>usePageContext().data</code>
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
