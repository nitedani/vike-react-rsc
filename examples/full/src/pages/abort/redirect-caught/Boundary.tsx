"use client";

import { Component, type ReactNode } from "react";

// An error boundary of the app's: it shows its fallback for any error, the redirect included
export class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <p data-boundary-fallback="">Caught</p> : this.props.children;
  }
}
