"use server";

import { rerender } from "vike-react-rsc/server";
import { increment } from "../serverCounts";

export async function bumpConfigTitle() {
  increment("configTitle");
  rerender();
}
