import React from "react";
import { createRoot } from "react-dom/client";
import { ExtensionProvider } from "./components/ExtensionProvider";
import { ExtensionAgent } from "./components/ExtensionAgent";

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <ExtensionProvider>
      <ExtensionAgent />
    </ExtensionProvider>
  );
}
