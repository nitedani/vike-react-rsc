"use server";

import type { ReactElement } from "react";
import { redirect } from "vike/abort";
import { rerender } from "vike-react-rsc/server";

// Read by the hooks of /actions, which run in another environment
const failNext = ((globalThis as { __failNext?: { data?: boolean; guard?: boolean } }).__failNext ??= {});

// Without rerender(), the caller gets the return value even though data() throws after the action
export async function saveThenFailData() {
  failNext.data = true;
  return "saved";
}

// With rerender(), the answer is the page, which the guard replaces with a 404: the call rejects
export async function saveThenGuard404() {
  failNext.guard = true;
  rerender();
  return "saved";
}

// The user can navigate before it returns
export async function slowSave() {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  rerender();
  return "saved";
}

// As if the target came from user input, e.g. ?next=: the browser must not run it
export async function redirectToScript(): Promise<string> {
  throw redirect("javascript:void(window.__redirected=1)");
}

// Loaded with rsc(): the client keeps showing the fallback
export async function FailingComponent(): Promise<ReactElement> {
  throw new Error("FailingComponent failed on demand");
}
