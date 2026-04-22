import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // ✅ Resets vertical and horizontal scroll to the start
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]); // This triggers every time the URL path changes

  return null;
};

export default ScrollToTop;