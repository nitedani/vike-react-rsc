import type { Config } from "vike/types";

export default {
  hydrateRootOptions: {
    // E.g. an app that reports its errors' stacks to an error tracker
    onUncaughtError: (error) => {
      document.body.dataset.reported = (error as Error).stack;
    },
  },
} satisfies Config["react"];
