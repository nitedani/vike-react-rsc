"use client";

import "./StyledClient.css";
import { NestedClient } from "./NestedClient";

export function StyledClient() {
  return (
    <div>
      <p data-styled-client="">Styled by a client component's CSS</p>
      <NestedClient />
    </div>
  );
}
