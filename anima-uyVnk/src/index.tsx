import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SectionModule } from "./screens/SectionModule";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <SectionModule />
  </StrictMode>,
);
