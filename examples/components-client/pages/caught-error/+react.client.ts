import type { Config } from "vike/types";

export default {
  hydrateRootOptions: {
    // E.g. an app that reports what its error boundaries catch, instead of logging it
    onCaughtError: (error) => {
      document.body.dataset.reported = String(error);
    },
  },
} satisfies Config["react"];
