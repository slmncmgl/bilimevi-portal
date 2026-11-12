// v1.0: Kayıt Güncelle işlem geçmişi (kim, hangi kayıtta, ne yaptı)
// POST: bir işlemi kaydeder. GET ?tally=<Tally Submission ID>: o kaydın işlemlerini döndürür (yeniden eskiye).
// Kayıtlar All_Submissions > "İşlem Geçmişi" sekmesinde durur; yazma/okuma n8n "Portal İşlem Geçmişi" workflow'u
// (v5JHnShn7yKFLP1O) üzerinden, N8N_PORTAL_TOKEN ile yapılır. Token tarayıcıya gitmez.
//
// Kullanıcı adı oturum token'ından alınır (Kimlik: "doğrulandı"). Token yoksa (izleme modu) tarayıcının
// bildirdiği ad yazılır ve Kimlik "beyan" olur; AUTH_ENFORCE=1 olunca token'sız istek zaten reddedilir.
import { oturumKontrol, tokenCoz } from "./_oturum.js";

const N8N = "https://n8n.bilimevi.cloud/webhook";

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") return res.status(405).json({ ok: false, hata: "Method not allowed" });

  // Sadece portalın kendi sayfalarından gelen istekleri kabul et
  const origin = req.headers.origin;
  if (origin && origin !== `https://${req.headers.host}` && !origin.startsWith("http://localhost")) {
    return res.status(403).json({ ok: false, hata: "Bu istek portal dışından geldi." });
  }
  if (!oturumKontrol(req, res, "islem-log")) return;
  if (!process.env.N8N_PORTAL_TOKEN) return res.status(500).json({ ok: false, hata: "N8N_PORTAL_TOKEN tanımlı değil." });

  const headers = { "Content-Type": "application/json", "X-Portal-Token": process.env.N8N_PORTAL_TOKEN };

  try {
    if (req.method === "GET") {
      const tally = String(req.query?.tally || "").trim();
      if (!tally) return res.status(400).json({ ok: false, hata: "Tally Submission ID eksik." });
      const r = await fetch(`${N8N}/islem-getir?tally=${encodeURIComponent(tally)}`, { headers });
      const data = await r.json().catch(() => null);
      if (!r.ok || !data) return res.status(502).json({ ok: false, hata: `Geçmiş okunamadı (HTTP ${r.status}).` });
      return res.status(200).json(data);
    }

    const { tallyId, islem, ogrenci, detay, kullanici } = req.body || {};
    if (!tallyId || !islem) return res.status(400).json({ ok: false, hata: "tallyId ve islem zorunlu." });
    const oturum = tokenCoz(req).kullanici;
    const r = await fetch(`${N8N}/islem-kaydet`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        tallyId: String(tallyId),
        islem: String(islem),
        ogrenci: String(ogrenci || ""),
        detay: String(detay || ""),
        kullanici: oturum?.name || String(kullanici || ""),
        kimlik: oturum?.name ? "doğrulandı" : "beyan",
      }),
    });
    if (!r.ok) return res.status(502).json({ ok: false, hata: `İşlem kaydedilemedi (HTTP ${r.status}).` });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(502).json({ ok: false, hata: `n8n'e ulaşılamadı: ${err.message}` });
  }
}
