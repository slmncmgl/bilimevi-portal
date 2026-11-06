// v1.0 (BFT v122): Fiyat teklifinde danışmanın elle girdiği indirim -> n8n "BFT Elle İndirim Bildirimi" -> it@bilimevi.com
// PDF indirildiğinde portal çağırır (sadece staff). Token tarayıcıya gitmez; isteği bu sunucu fonksiyonu atar.
// n8n webhook'u "Portal → Sözleşme Gönder" header kimliğiyle korunur (aynı N8N_PORTAL_TOKEN).
import { oturumKontrol } from "./_oturum.js";

const N8N_URL = "https://n8n.bilimevi.cloud/webhook/bft-elle-indirim";

const metin = (v, n = 200) => String(v ?? "").slice(0, n);
const sayi = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, hata: "Method not allowed" });

  const origin = req.headers.origin;
  if (origin && origin !== `https://${req.headers.host}` && !origin.startsWith("http://localhost")) {
    return res.status(403).json({ ok: false, hata: "Bu istek portal dışından geldi." });
  }
  if (!oturumKontrol(req, res, "indirim-bildirim")) return;

  if (!process.env.N8N_PORTAL_TOKEN) {
    return res.status(500).json({ ok: false, hata: "N8N_PORTAL_TOKEN tanımlı değil." });
  }

  const { danisman, danismanMail, surum, okullar } = req.body || {};
  if (!Array.isArray(okullar) || !okullar.length) {
    return res.status(400).json({ ok: false, hata: "okullar boş" });
  }

  // Sadece beklenen alanlar iletilir (izin listesi), uzunluklar sınırlı.
  const temiz = okullar.slice(0, 10).map(o => ({
    okul: metin(o.okul, 80), sehir: metin(o.sehir, 80), kurs: metin(o.kurs, 150), hafta: metin(o.hafta, 10),
    baslangic: metin(o.baslangic, 30), paraBirimi: metin(o.paraBirimi, 10),
    hedef: metin(o.hedef, 40), tur: o.tur === "yuzde" ? "yuzde" : "tutar", deger: sayi(o.deger),
    indirim: sayi(o.indirim), toplamOnce: sayi(o.toplamOnce), toplamSonra: sayi(o.toplamSonra),
    not: metin(o.not, 200),
  }));

  try {
    const r = await fetch(N8N_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Portal-Token": process.env.N8N_PORTAL_TOKEN },
      body: JSON.stringify({ danisman: metin(danisman, 80), danismanMail: metin(danismanMail, 120), surum: metin(surum, 60), okullar: temiz }),
    });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { ok: r.ok }; }
    return res.status(r.ok ? 200 : 502).json(r.ok ? data : { ok: false, hata: `n8n HTTP ${r.status}` });
  } catch (err) {
    return res.status(502).json({ ok: false, hata: err.message });
  }
}
