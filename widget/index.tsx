import React from "react";
import { createRoot } from "react-dom/client";
import { Wizard } from "../src/components/Wizard";

function mount() {
  const containers = document.querySelectorAll("[data-irrigation-quote]");
  containers.forEach((container) => {
    const root = createRoot(container);
    root.render(React.createElement(Wizard));
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
