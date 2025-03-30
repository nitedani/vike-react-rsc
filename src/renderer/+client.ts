// --- Webpack global shims ---
if (typeof (window as any).__webpack_require__ === "undefined") {
  (window as any).__webpack_require__ = (id: string) => {
    console.error("Client Shim __webpack_require__:", id);
    return {};
  };
}
if (typeof (window as any).__webpack_chunk_load__ === "undefined") {
  (window as any).__webpack_chunk_load__ = (id: string) => {
    console.log("Client Shim __webpack_chunk_load__:", id);
    return Promise.resolve();
  };
}
