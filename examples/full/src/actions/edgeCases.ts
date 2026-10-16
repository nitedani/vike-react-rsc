"use server";

import type { ReactElement } from "react";
import { redirect, render } from "vike/abort";
import { getPageContext } from "vike-react-rsc/pageContext";
import { rerender } from "vike-react-rsc/server";

// Read by the hooks of /actions, which run in another environment
const failNext = ((globalThis as { __failNext?: { data?: boolean; guard?: boolean; page?: boolean } }).__failNext ??= {});

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

// With rerender(), the answer is the page, which throws redirect() once
export async function saveThenRedirectPage() {
  failNext.page = true;
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

// As when the session is missing: the caller shows the login page, at the same URL
export async function requireLogin(): Promise<string> {
  throw render("/login");
}

// Its cookie reaches the guard of the page it renders
export async function loginThenRender(): Promise<string> {
  getPageContext().cookies.set("session", "bob", { path: "/" });
  throw render("/account");
}

// With useActionState(): its count survives a submit without JavaScript
export async function countSubmit(submits: number): Promise<number> {
  return submits + 1;
}

// Loaded with rsc(): redirects on its first load, as when a session is missing
let hasRedirected = false;
export async function RedirectOnceComponent(): Promise<string> {
  if (!hasRedirected) {
    hasRedirected = true;
    throw redirect("/");
  }
  return "Loaded";
}

// Loaded with rsc(): the client keeps showing the fallback
export async function FailingComponent(): Promise<ReactElement> {
  throw new Error("FailingComponent failed on demand");
}
