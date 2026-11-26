"use client";

import { useState } from "react";
import { rsc } from "vike-react-rsc/client";
import { LayoutComponent } from "../../../actions/redirectInLayout";

const LayoutComponentRsc = rsc(LayoutComponent);

// Stays mounted when the page changes to the other one under this layout
export function LayoutPanel() {
  const [isShown, setIsShown] = useState(false);
  return (
    <>
      <button onClick={() => setIsShown(true)}>Load the server component in the layout</button>
      <p data-rsc-in-layout="">{isShown && <LayoutComponentRsc fallback="Not loaded" />}</p>
    </>
  );
}
