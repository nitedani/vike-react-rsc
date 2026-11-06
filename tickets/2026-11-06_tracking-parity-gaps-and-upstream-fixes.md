Issue: [#48](https://github.com/nitedani/vike-react-rsc/issues/48)

# Tracking: vike-react-rsc's last parity gaps and the upstream fixes it waits on

## TLDR

Tracks what is still open from #9, #19 and #30: the last gaps in parity with vike-react, Next and TanStack Start, and the Vike, @vitejs/plugin-rsc and other upstream fixes that let vike-react-rsc drop a workaround. Decisions so far are kept in a comment on the issue.

## Why it matters

Open items (see the issue for links and detail):
- Experimental flag letting a client component render a `"use server component"` file (#22, from #6).
- Publish to npm (#3).
- `vike dev`: a client package the first page doesn't use is found late, so Vite re-bundles; a MUI page opened second stays blank.
- #30: server components and the HTML hooks share one `pageContext`.
- Vike: `_skipGuardAndData_experimentalRSC` as a function (vikejs/vike#3648), `render(url, reason)` reason lost on client navigation, `throw render()` inside Suspense (vikejs/vike#3726), `pageContext.request`, `AbortError` (vikejs/vike#1707), `after()`, `pageContext.cookies`.
- plugin-rsc: wait for client modules on the first dev request (vitejs/vite-plugin-react#1539).
- universal-middleware#463 and compiled#1960 workarounds wait on upstream.

Read the issue for the full list and the Decisions comment.
