import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SectionCta } from "./screens/SectionCta";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <SectionCta />
  </StrictMode>,
);
