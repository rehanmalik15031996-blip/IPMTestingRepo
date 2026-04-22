import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { NavNav } from "./screens/NavNav";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <NavNav />
  </StrictMode>,
);
