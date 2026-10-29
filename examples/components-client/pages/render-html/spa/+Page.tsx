"use server component";
import { getStore } from "../getStore";

export default function Page() {
  return <p id="spa-store">{getStore().greeting}</p>;
}
