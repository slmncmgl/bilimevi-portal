import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { fetchTokenEkle } from "./lib/oturum.js";

// Güvenlik Faz 1: /api/ isteklerine oturum token'ı otomatik eklenir
fetchTokenEkle();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
