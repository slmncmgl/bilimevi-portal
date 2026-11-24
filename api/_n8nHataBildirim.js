// (24.11.2026) BFT v141: Teklif portalı "Hata bildir" kutusu -> n8n "BFT Hata Bildirimi" (9oYA6OIyjdmJprkc) -> it@bilimevi.com
// Ayrı fonksiyon değil: api/n8n.js ?hedef=hata-bildirimi, /api/hata-bildirimi vercel.json'da oraya yönlenir (Hobby 12 fonksiyon sınırı).
import { oturumKontrol } from "./_oturum.js";

const N8N_URL = "https://n8n.bilimevi.cloud/webhook/bft-hata-bildirimi";
const metin = (v, n = 200) => String(v ?? "").slice(0, n);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, hata: "Method not allowed" });
  const origin = req.headers.origin;
  if (origin && origin !== `https://${req.headers.host}` && !origin.startsWith("http://localhost")) {
    return res.status(403).json({ ok: false, hata: "Bu istek portal dışından geldi." });
  }
  if (!oturumKontrol(req, res, "hata-bildirimi")) return;
  if (!process.env.N8N_PORTAL_TOKEN) return res.status(500).json({ ok: false, hata: "N8N_PORTAL_TOKEN tanımlı değil." });

  const b = req.body || {};
  const mesaj = metin(b.mesaj, 3000).trim();
  if (!mesaj) return res.status(400).json({ ok: false, hata: "Mesaj boş" });
  const govde = {
    mesaj, danisman: metin(b.danisman, 80), danismanMail: metin(b.danismanMail, 120), asama: metin(b.asama, 40),
    okul: metin(b.okul, 80), sehir: metin(b.sehir, 80), kurs: metin(b.kurs, 150), hafta: metin(b.hafta, 10),
    surum: metin(b.surum, 60), sayfa: metin(b.sayfa, 300), tarayici: metin(req.headers["user-agent"], 200),
  };
  try {
    const r = await fetch(N8N_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Portal-Token": process.env.N8N_PORTAL_TOKEN },
      body: JSON.stringify(govde),
    });
    return res.status(r.ok ? 200 : 502).json(r.ok ? { ok: true } : { ok: false, hata: `n8n HTTP ${r.status}` });
  } catch (err) {
    return res.status(502).json({ ok: false, hata: err.message });
  }
}
