import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SectionHero } from "./screens/SectionHero";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <SectionHero />
  </StrictMode>,
);
