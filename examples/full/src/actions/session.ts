"use server";

import { redirect } from "vike/abort";
import { getResponseHeaders, rerender } from "vike-react-rsc/server";

export async function login(formData: FormData) {
  const user = String(formData.get("user"));
  getResponseHeaders().append("Set-Cookie", `session=${encodeURIComponent(user)}; Path=/; HttpOnly; SameSite=Lax`);
  rerender();
}

export async function logout() {
  getResponseHeaders().append("Set-Cookie", "session=; Path=/; Max-Age=0");
  throw redirect("/");
}
