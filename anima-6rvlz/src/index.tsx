import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SectionContact } from "./screens/SectionContact";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <SectionContact />
  </StrictMode>,
);
