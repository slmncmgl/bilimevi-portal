// v1.0 (Kayıt Form Linkleri v2.3): "Yeni Kayıt Formu Talebi" → n8n "Portal → Yeni Kayıt Formu Talebi" (BskFPXRVaeqZBnKG)
// n8n talebi Grup Yaz Okulları dosyasının "Form Talepleri" sekmesine yazar, Selman-Personel-ToDo hattına WhatsApp atar.
// Token tarayıcıya gitmez; isteği bu sunucu fonksiyonu atar. Webhook "Portal → Sözleşme Gönder" header kimliğiyle korunur (N8N_PORTAL_TOKEN).
import { oturumKontrol, tokenCoz } from "./_oturum.js";

const N8N_URL = "https://n8n.bilimevi.cloud/webhook/kayit-formu-talebi";

// Sheet başlıklarıyla birebir aynı. Sadece bunlar iletilir (izin listesi).
const ALANLAR = [
  "Atanacak Sabit Danışman (varsa)", "Tr Okulu", "OKULLAR", "Konum", "Bulunduğu Ülke",
  "Başlangıç Tarihi", "Bitiş Tarihi", "Kurs Süresi (Hafta veya Gün)", "Program Adı",
  "Ders Sayısı", "Yaş", "Form Başlığı", "Program Seçimi (varsa)",
];
const ZORUNLU = ["Tr Okulu", "OKULLAR", "Başlangıç Tarihi", "Bitiş Tarihi"];

const metin = (v, n) => String(v ?? "").slice(0, n);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, hata: "Method not allowed" });

  const origin = req.headers.origin;
  if (origin && origin !== `https://${req.headers.host}` && !origin.startsWith("http://localhost")) {
    return res.status(403).json({ ok: false, hata: "Bu istek portal dışından geldi." });
  }
  if (!oturumKontrol(req, res, "kayit-formu-talebi")) return;

  if (!process.env.N8N_PORTAL_TOKEN) {
    return res.status(500).json({ ok: false, hata: "N8N_PORTAL_TOKEN tanımlı değil." });
  }

  const { talepEden, ornekForm, alanlar, not } = req.body || {};
  if (!alanlar || typeof alanlar !== "object") {
    return res.status(400).json({ ok: false, hata: "alanlar boş" });
  }
  const temiz = {};
  for (const a of ALANLAR) temiz[a] = metin(alanlar[a], a === "Form Başlığı" || a === "Program Seçimi (varsa)" ? 1000 : 200);
  const eksik = ZORUNLU.filter(a => !temiz[a].trim());
  if (eksik.length) return res.status(400).json({ ok: false, hata: `Zorunlu alan boş: ${eksik.join(", ")}` });

  // Talep eden: geçerli token varsa oradaki ad, yoksa (izleme modu) tarayıcının gönderdiği ad
  const kullanici = tokenCoz(req).kullanici;
  const ad = kullanici?.name || kullanici?.email || talepEden;

  try {
    const r = await fetch(N8N_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Portal-Token": process.env.N8N_PORTAL_TOKEN },
      body: JSON.stringify({ talepEden: metin(ad, 120), ornekForm: metin(ornekForm, 300), alanlar: temiz, not: metin(not, 1000) }),
    });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }
    if (r.ok && data?.ok) return res.status(200).json(data);
    return res.status(502).json({ ok: false, hata: data?.hata || `n8n HTTP ${r.status}` });
  } catch (err) {
    return res.status(502).json({ ok: false, hata: err.message });
  }
}
