import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SectionService } from "./screens/SectionService";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <SectionService />
  </StrictMode>,
);
