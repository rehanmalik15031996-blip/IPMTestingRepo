import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { FooterFooter } from "./screens/FooterFooter";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <FooterFooter />
  </StrictMode>,
);
