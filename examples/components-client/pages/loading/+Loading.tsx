import { useState } from "react";

export default {
  // The build finds `layout` quoted too
  "layout": function Layout() {
    // Only a client component can call it
    const [dots] = useState("...");
    return <p id="loading">Loading the page{dots}</p>;
  },
};
