// v1.3: nabız 1 dk; dürtme (👋): durt(id) o kişiye el sallar, Dashboard açıkken bekleyen dürtmeler alınır ve
//   "bilimevi-durtme" olayıyla (detail: [kimden adları]) yayınlanır. Liste { id, ad } nesneleri, "ben" kendi id'miz.
// v1.2: ad da gönderilir; olay { sayi, liste } taşır (etikete tıklayınca isim listesi)
// v1.1: Nabız doğrudan Coolify'daki n8n'e gider (Vercel Hobby 12 fonksiyon sınırı dolu, api/cevrimici.js kaldırıldı).
// v1.0: Çevrimiçi nabzı. Giriş yapmış her sekme düzenli bildirir (sekme gizliyse atlar).
// Son alınan durum "bilimevi-cevrimici" olayıyla yayınlanır; Dashboard'daki etiket bunu dinler.
import { getSession } from "../utils/sheets";

// n8n "Portal Çevrimiçi Sayacı" (xh9SPxvWq3XwFJ7D). Kimlik yok, sadece sayaç; CORS sadece portal adreslerine açık.
const NABIZ_URL = "https://n8n.bilimevi.cloud/webhook/portal-cevrimici";

const ARALIK_MS = 60 * 1000;
let sonDurum = null;
let durtmeDinleyen = 0; // Dürtmeler sadece gösterecek bir ekran (Dashboard) açıkken alınır, yoksa kaybolurdu

export function cevrimiciDurum() {
  return sonDurum;
}

export function durtmeDinle(acik) {
  durtmeDinleyen = Math.max(0, durtmeDinleyen + (acik ? 1 : -1));
}

export async function nabizGonder(ek = {}) {
  const user = getSession();
  if (!user) return null;
  try {
    const r = await fetch(NABIZ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ v: 2, kullanici: user.email || user.name || "", ad: user.name || "", durtmeAl: durtmeDinleyen > 0, ...ek }),
    });
    const data = await r.json().catch(() => null);
    if (!data?.ok) return null;
    sonDurum = { sayi: data.sayi, liste: Array.isArray(data.liste) ? data.liste : [], ben: data.ben || null };
    window.dispatchEvent(new CustomEvent("bilimevi-cevrimici", { detail: sonDurum }));
    if (Array.isArray(data.gelen) && data.gelen.length) {
      window.dispatchEvent(new CustomEvent("bilimevi-durtme", { detail: data.gelen }));
    }
    return data;
  } catch (_) {
    return null;
  }
}

export async function durt(id) {
  const data = await nabizGonder({ durt: id });
  return !!data?.durtuldu;
}

export function nabizBaslat() {
  if (typeof window === "undefined" || window.__bilimeviNabiz) return;
  window.__bilimeviNabiz = true;
  setInterval(() => { if (!document.hidden) nabizGonder(); }, ARALIK_MS);
}
