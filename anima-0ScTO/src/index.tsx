import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { FoundingPricing } from "./screens/FoundingPricing";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <FoundingPricing />
  </StrictMode>,
);
