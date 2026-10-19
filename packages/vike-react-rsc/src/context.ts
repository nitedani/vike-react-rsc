import type * as React from "react";
import { createContext } from "react";
import type { PageContext } from "vike/types";
import { getShared } from "./shared";

// Every client component renders inside it: the browser's Root, and PageContextProvider in the HTML render and Head
export const Context: React.Context<PageContext> = getShared("pageContext", () => createContext<PageContext>(undefined!));
