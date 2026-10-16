"use server";

import { redirect } from "vike/abort";
import { getPageContext } from "vike-react-rsc/pageContext";
import { rerender } from "vike-react-rsc/server";
import { increment } from "../serverCounts";

export async function login(formData: FormData) {
  increment("login");
  const user = String(formData.get("user"));
  // Without a name, the guard of /account still shows the login page
  if (user) getPageContext().cookies.set("session", user, { path: "/", httpOnly: true, sameSite: "lax" });
  rerender();
}

export async function logout() {
  getPageContext().cookies.delete("session", { path: "/" });
  throw redirect("/");
}
