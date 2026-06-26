import { createRoot } from "react-dom/client";
import FiyatTeklifi from "./pages/FiyatTeklifi";

// WordPress shortcode'dan gelen div'e mount et
const rootId = window.BFT_CONFIG?.rootId || "bft-root";
const container = document.getElementById(rootId);

if (container) {
  createRoot(container).render(<FiyatTeklifi />);
}
