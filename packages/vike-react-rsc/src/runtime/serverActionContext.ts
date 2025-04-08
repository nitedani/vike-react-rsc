import envName from "virtual:enviroment-name";
import { tinyassert } from "@hiogawa/utils";
tinyassert(envName === "rsc", "Invalid environment");

export { rerender };
export { getServerActionContext };
export { provideServerActionContext };

import { AsyncLocalStorage } from "async_hooks";
import { getGlobalObject } from "../utils/getGlobalObject.js";

// Define the server action context type
export interface ServerActionContextType {
  shouldRerender: boolean;
}

// Create a global object to store the server action context
const globalObject = getGlobalObject("ServerActionContext.ts", {
  serverActionContext: new AsyncLocalStorage<ServerActionContextType>(),
});

/**
 * Provides a server action context for the duration of the callback execution
 * @param context The server action context
 * @param callback The function to execute within the context
 * @returns The result of the callback
 */
function provideServerActionContext<T>(
  context: ServerActionContextType,
  callback: () => T
): T {
  const { serverActionContext } = globalObject;
  return serverActionContext.run(context, callback);
}

/**
 * Gets the current server action context
 * @returns The current server action context or undefined if not in a server action
 */
function getServerActionContext(): ServerActionContextType | undefined {
  const { serverActionContext } = globalObject;
  return serverActionContext.getStore();
}

/**
 * Call this function within a server action to trigger a re-render of the page
 * If not called, the server action will only return the action result without re-rendering
 */
function rerender(): void {
  const context = getServerActionContext();
  if (context) {
    context.shouldRerender = true;
  } else {
    console.warn("[Server] rerender() called outside of a server action context");
  }
}
