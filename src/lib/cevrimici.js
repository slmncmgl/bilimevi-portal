// v1.2: ad da gönderilir; olay { sayi, liste } taşır (etikete tıklayınca isim listesi)
// v1.1: Nabız doğrudan Coolify'daki n8n'e gider (Vercel Hobby 12 fonksiyon sınırı dolu, api/cevrimici.js kaldırıldı).
// v1.0: Çevrimiçi nabzı. Giriş yapmış her sekme 5 dk'da bir bildirir (sekme gizliyse atlar).
// Son alınan sayı "bilimevi-cevrimici" olayıyla yayınlanır; Dashboard'daki etiket bunu dinler.
import { getSession } from "../utils/sheets";

// n8n "Portal Çevrimiçi Sayacı" (xh9SPxvWq3XwFJ7D). Kimlik yok, sadece sayaç; CORS sadece portal adreslerine açık.
const NABIZ_URL = "https://n8n.bilimevi.cloud/webhook/portal-cevrimici";

const ARALIK_MS = 5 * 60 * 1000;
let sonDurum = null;

export function cevrimiciDurum() {
  return sonDurum;
}

export async function nabizGonder() {
  const user = getSession();
  if (!user) return;
  try {
    const r = await fetch(NABIZ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kullanici: user.email || user.name || "", ad: user.name || "" }),
    });
    const data = await r.json().catch(() => null);
    if (data?.ok) {
      sonDurum = { sayi: data.sayi, liste: Array.isArray(data.liste) ? data.liste : [] };
      window.dispatchEvent(new CustomEvent("bilimevi-cevrimici", { detail: sonDurum }));
    }
  } catch (_) {}
}

export function nabizBaslat() {
  if (typeof window === "undefined" || window.__bilimeviNabiz) return;
  window.__bilimeviNabiz = true;
  setInterval(() => { if (!document.hidden) nabizGonder(); }, ARALIK_MS);
}
