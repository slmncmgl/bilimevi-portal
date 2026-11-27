// v1.0: Portal ortak marka renkleri (CSS değişkenleri). Düğmeler, sekmeler, Geri vb. renkleri buradan alır:
//   var(--marka)       ana renk (düğme zemini, seçili sekme, link)
//   var(--marka-koyu)  üzerine gelince / koyu ton
//   var(--marka-acik)  seçili satır / açık zemin
// Tema v1: camgöbeği (#0891b2, Tailwind cyan-600) — eski görünüm. Tema v2: Bilimevi kurumsal laciverti (#001A71, logodan).
// Seçim tarayıcıda "portalTema" anahtarında saklanır; <html data-tema="v2"> ile uygulanır.
import { useSyncExternalStore } from "react";

const STIL = `
:root { --marka: #0891b2; --marka-koyu: #0e7490; --marka-acik: #ecfeff; }
:root[data-tema="v2"] { --marka: #001A71; --marka-koyu: #000f4a; --marka-acik: #eef0f8; }
`;
const ANAHTAR = "portalTema";
let tema = "v1";
const dinleyiciler = new Set();

export function temaBaslat() {
  if (typeof document === "undefined") return;
  if (!document.getElementById("portal-tema-stil")) {
    const s = document.createElement("style");
    s.id = "portal-tema-stil";
    s.textContent = STIL;
    document.head.appendChild(s);
  }
  try { tema = (localStorage.getItem(ANAHTAR) || localStorage.getItem("takipTema")) === "v2" ? "v2" : "v1"; } catch { tema = "v1"; }
  document.documentElement.dataset.tema = tema;
}

export function temaAyarla(v) {
  tema = v === "v2" ? "v2" : "v1";
  try { localStorage.setItem(ANAHTAR, tema); } catch {}
  document.documentElement.dataset.tema = tema;
  dinleyiciler.forEach(f => f());
}

export function useTema() {
  return useSyncExternalStore(f => { dinleyiciler.add(f); return () => dinleyiciler.delete(f); }, () => tema);
}
