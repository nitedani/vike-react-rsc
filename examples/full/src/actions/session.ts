"use server";

import { redirect } from "vike/abort";
import { getRequestContext, rerender } from "vike-react-rsc/server";
import { increment } from "../serverCounts";

export async function login(formData: FormData) {
  increment("login");
  const user = String(formData.get("user"));
  // Without a name, the guard of /account still shows the login page
  if (user) getRequestContext().cookies.set("session", user, { path: "/", httpOnly: true, sameSite: "lax" });
  rerender();
}

export async function logout() {
  getRequestContext().cookies.delete("session", { path: "/" });
  throw redirect("/");
}
