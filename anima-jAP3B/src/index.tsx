import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SectionComparison } from "./screens/SectionComparison";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <SectionComparison />
  </StrictMode>,
);
