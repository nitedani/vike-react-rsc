// testNavigationKeepsPage(): the page on screen once a client navigation has ended
export function onPageTransitionEnd() {
  (window as { shownAtTransitionEnd?: string | null }).shownAtTransitionEnd = document.querySelector("[data-url-pathname]")?.textContent ?? null;
}
