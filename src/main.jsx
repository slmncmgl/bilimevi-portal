import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import HataYakalayici from "./components/HataYakalayici.jsx";
import { fetchTokenEkle } from "./lib/oturum.js";
import { nabizBaslat } from "./lib/cevrimici.js";
import { temaBaslat } from "./lib/tema.js";

// Ortak marka renkleri (Tema v1 / v2)
temaBaslat();
// Güvenlik Faz 1: /api/ isteklerine oturum token'ı otomatik eklenir
fetchTokenEkle();
// Çevrimiçi sayacı: giriş yapmış sekmeler 5 dk'da bir nabız gönderir
nabizBaslat();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <HataYakalayici>
      <App />
    </HataYakalayici>
  </StrictMode>
);
