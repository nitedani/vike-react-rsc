Issue: [#7](https://github.com/nitedani/vike-react-rsc/issues/7)

# Telefunc vs Server Actions

## TLDR

If telefunctions can return RSC elements, Server Actions have no functional benefit over them. brillout leans towards recommending Telefunc (`.telefunc.js` is more explicit than `"use server"`) while possibly still supporting Server Actions for RSC libraries.

## Why it matters

Decides which mutation API vike-react-rsc recommends and supports.
