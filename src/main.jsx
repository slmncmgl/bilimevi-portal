import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { fetchTokenEkle } from "./lib/oturum.js";
import { nabizBaslat } from "./lib/cevrimici.js";

// Güvenlik Faz 1: /api/ isteklerine oturum token'ı otomatik eklenir
fetchTokenEkle();
// Çevrimiçi sayacı: giriş yapmış sekmeler 5 dk'da bir nabız gönderir
nabizBaslat();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
