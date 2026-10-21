import type { GlobalContextServer } from "vike/types";

export function onCreateGlobalContext(globalContext: GlobalContextServer): void {
  globalContext.appName = "Task Manager";
}

declare global {
  namespace Vike {
    interface GlobalContext {
      appName?: string;
    }
  }
}
