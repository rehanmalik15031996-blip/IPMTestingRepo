import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SectionPlatform } from "./screens/SectionPlatform";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <SectionPlatform />
  </StrictMode>,
);
