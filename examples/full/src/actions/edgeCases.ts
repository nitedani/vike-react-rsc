"use server";

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
