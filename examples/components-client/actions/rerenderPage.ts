"use server";
import { rerender } from "vike-react-rsc/server";

export async function rerenderPage() {
  rerender();
}
