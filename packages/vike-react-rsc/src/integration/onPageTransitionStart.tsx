import type { OnPageTransitionStartAsync } from "vike/types";

export const onPageTransitionStart: OnPageTransitionStartAsync =
  async function () {
    const neverResolvingPromise = new Promise(() => {}) as any;
    window.__setPayloadPromise(neverResolvingPromise);
  };
