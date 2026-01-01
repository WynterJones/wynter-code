/**
 * Farmwork Tycoon Standalone Entry Point
 * Builds as a separate bundle that can be served via the mobile API
 */

import { createRoot } from "react-dom/client";
import { App } from "./App";
import "../styles/globals.css"; // Import base styles

// Set standalone mode flag
(window as unknown as { FARMWORK_STANDALONE_MODE: boolean }).FARMWORK_STANDALONE_MODE = true;

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

const root = createRoot(container);
root.render(<App />);
