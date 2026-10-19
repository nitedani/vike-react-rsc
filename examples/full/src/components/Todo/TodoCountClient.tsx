"use client";

import { usePageContext } from "vike-react-rsc/pageContext";
import { sharedStyles } from "../../styles/shared";

export default function TodoCountClient() {
  const { todoCount } = usePageContext().data as { todoCount: number };
  return (
    <p id="todo-count-client" css={sharedStyles.paragraph}>
      A client component reads the same {todoCount} tasks from <code>usePageContext().data</code>
    </p>
  );
}
