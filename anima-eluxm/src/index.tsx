import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SectionDarkFeature } from "./screens/SectionDarkFeature";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <SectionDarkFeature />
  </StrictMode>,
);
