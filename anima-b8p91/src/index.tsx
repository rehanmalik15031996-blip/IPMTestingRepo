import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SectionHowItWorks } from "./screens/SectionHowItWorks";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <SectionHowItWorks />
  </StrictMode>,
);
