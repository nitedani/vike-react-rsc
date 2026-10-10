"use server";

import { redirect } from "vike/abort";
import { getResponseHeaders, rerender } from "vike-react-rsc/server";
import { increment } from "../serverCounts";

export async function login(formData: FormData) {
  increment("login");
  const user = String(formData.get("user"));
  // Without a name, the guard of /account still shows the login page
  if (user) getResponseHeaders().append("Set-Cookie", `session=${encodeURIComponent(user)}; Path=/; HttpOnly; SameSite=Lax`);
  rerender();
}

export async function logout() {
  getResponseHeaders().append("Set-Cookie", "session=; Path=/; Max-Age=0");
  throw redirect("/");
}
