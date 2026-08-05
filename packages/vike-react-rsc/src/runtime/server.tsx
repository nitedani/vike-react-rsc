import envName from "virtual:environment-name";
import { tinyassert } from "@hiogawa/utils";
tinyassert(envName === "rsc", "Invalid environment");

import { renderToReadableStream, decodeReply, loadServerAction } from '@vitejs/plugin-rsc/rsc'
import type { PageContext } from "vike/types";
import { getPageElementRsc } from "../integration/getPageElement/getPageElement-server";
import { providePageContext } from "../hooks/pageContext/pageContext-server";
import { provideServerActionContext } from "./serverActionContext";

// A client that navigates away mid-stream cancels the response, which aborts the
// Flight render. React reports that through onError exactly like a render failure,
// and the default handler prints it. Navigating away is normal operation, so these
// are dropped while anything else still surfaces.
function isClientDisconnect(error: unknown): boolean {
  const { code, name } = (error ?? {}) as { code?: unknown; name?: unknown };
  return code === "ERR_STREAM_PREMATURE_CLOSE" || name === "AbortError";
}

const renderOptions = {
  onError(error: unknown) {
    if (isClientDisconnect(error)) return;
    console.error("[vike-react-rsc] Error while rendering the RSC payload:", error);
  },
};

export async function renderPageRsc(
  pageContext: PageContext
): Promise<ReadableStream<Uint8Array<ArrayBufferLike>>> {
  const root = await getPageElementRsc(pageContext);
  return providePageContext(pageContext, () =>
    renderToReadableStream(
      // TODO: add form when initial request is POST
      {
        root,
      },
      renderOptions
    )
  );
}

export async function handleServerAction({
  actionId,
  pageContext,
  body,
}: {
  actionId: string;
  pageContext: PageContext;
  body: string | FormData;
}): Promise<ReadableStream<Uint8Array>> {
  // Create context for this server action execution
  const context = { shouldRerender: false };

  // Decode arguments and get the action function
  const [args, action] = await Promise.all([
    decodeReply(body),
    loadServerAction(actionId),
  ]);

  // Execute the action within the server action context
  const returnValue = await provideServerActionContext(context, () =>
    providePageContext(pageContext, () => action.apply(null, args))
  );

  // Only include the root component if rerender was called
  if (context.shouldRerender) {
    const root = await getPageElementRsc(pageContext);
    return providePageContext(pageContext, () =>
      renderToReadableStream(
        {
          returnValue,
          root,
        },
        renderOptions
      )
    );
  } else {
    return providePageContext(pageContext, () =>
      renderToReadableStream(
        {
          returnValue,
        },
        renderOptions
      )
    );
  }
}

if (import.meta.hot) {
  import.meta.hot.accept()
}
