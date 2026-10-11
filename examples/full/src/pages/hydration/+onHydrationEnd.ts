import { navigate } from "vike/client/router";

// Vike calls it once React started hydrating: this navigation can end before React commits the hydration
export function onHydrationEnd() {
  navigate("/");
}
