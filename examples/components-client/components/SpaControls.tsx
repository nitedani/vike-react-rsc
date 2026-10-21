"use client";
import { rerenderPage } from "../actions/rerenderPage";

// It reads window while it renders, so it renders only in the browser
export function SpaControls() {
  return (
    <button id="spa-rerender" type="button" onClick={() => rerenderPage()}>
      Render again, in a {window.innerWidth}px wide window
    </button>
  );
}
