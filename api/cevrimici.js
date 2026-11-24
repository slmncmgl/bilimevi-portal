// v1.0: Portal çevrimiçi sayacı. Açık her portal sekmesi 5 dk'da bir POST atar, cevapta çevrimiçi kişi sayısı döner.
// Sayım n8n "Portal Çevrimiçi Sayacı" workflow'unda (xh9SPxvWq3XwFJ7D), son 6 dk'da görülen farklı kullanıcılar.
// Kullanıcı anahtarı oturum token'ındaki e-posta; token yoksa (izleme modu) tarayıcının bildirdiği ad.
import { oturumKontrol, tokenCoz } from "./_oturum.js";

const N8N = "https://n8n.bilimevi.cloud/webhook";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, hata: "Method not allowed" });

  const origin = req.headers.origin;
  if (origin && origin !== `https://${req.headers.host}` && !origin.startsWith("http://localhost")) {
    return res.status(403).json({ ok: false, hata: "Bu istek portal dışından geldi." });
  }
  if (!oturumKontrol(req, res, "cevrimici")) return;
  if (!process.env.N8N_PORTAL_TOKEN) return res.status(500).json({ ok: false, hata: "N8N_PORTAL_TOKEN tanımlı değil." });

  const oturum = tokenCoz(req).kullanici;
  const kullanici = oturum?.email || String(req.body?.kullanici || "").trim();
  if (!kullanici) return res.status(400).json({ ok: false, hata: "Kullanıcı bilinmiyor." });

  try {
    const r = await fetch(`${N8N}/portal-cevrimici`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Portal-Token": process.env.N8N_PORTAL_TOKEN },
      body: JSON.stringify({ kullanici }),
    });
    const data = await r.json().catch(() => null);
    if (!r.ok || !data) return res.status(502).json({ ok: false, hata: `Sayı alınamadı (HTTP ${r.status}).` });
    return res.status(200).json({ ok: true, sayi: Number(data.sayi) || 0 });
  } catch (err) {
    return res.status(502).json({ ok: false, hata: `n8n'e ulaşılamadı: ${err.message}` });
  }
}
