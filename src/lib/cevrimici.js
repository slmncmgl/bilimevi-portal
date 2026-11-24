// v1.0: Çevrimiçi nabzı. Giriş yapmış her sekme 5 dk'da bir /api/cevrimici'ye bildirir (sekme gizliyse atlar).
// Son alınan sayı "bilimevi-cevrimici" olayıyla yayınlanır; Dashboard'daki etiket bunu dinler.
import { getSession } from "../utils/sheets";

const ARALIK_MS = 5 * 60 * 1000;
let sonSayi = null;

export function cevrimiciSayi() {
  return sonSayi;
}

export async function nabizGonder() {
  const user = getSession();
  if (!user) return;
  try {
    const r = await fetch("/api/cevrimici", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kullanici: user.email || user.name || "" }),
    });
    const data = await r.json().catch(() => null);
    if (data?.ok) {
      sonSayi = data.sayi;
      window.dispatchEvent(new CustomEvent("bilimevi-cevrimici", { detail: sonSayi }));
    }
  } catch (_) {}
}

export function nabizBaslat() {
  if (typeof window === "undefined" || window.__bilimeviNabiz) return;
  window.__bilimeviNabiz = true;
  setInterval(() => { if (!document.hidden) nabizGonder(); }, ARALIK_MS);
}
