// Portal "Sözleşmeyi Gönder" butonu -> n8n "Sözleşme Gönder (Portal)" workflow'u
// Token tarayıcıya hiç gitmez; isteği bu sunucu fonksiyonu atar.
// v1.1 (Güvenlik Faz 1): oturum kontrolü eklendi. Origin kontrolü curl ile atlatılabildiği için tek başına yetmiyor.
import { oturumKontrol } from "./_oturum.js";

const N8N_URL = "https://n8n.bilimevi.cloud/webhook/sozlesme-gonder";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, hata: "Method not allowed" });

  // Sadece portalın kendi sayfalarından gelen istekleri kabul et
  const origin = req.headers.origin;
  if (origin && origin !== `https://${req.headers.host}` && !origin.startsWith("http://localhost")) {
    return res.status(403).json({ ok: false, hata: "Bu istek portal dışından geldi." });
  }
  if (!oturumKontrol(req, res, "sozlesme-gonder")) return;

  // dry_run bilinçli olarak iletilmiyor: önizleme yanıtı öğrencinin telefon/mail bilgisini içeriyor
  const { tc, tally_submission_id, gonderen } = req.body || {};
  if (!tc) return res.status(400).json({ ok: false, hata: "TC Kimlik No eksik." });

  if (!process.env.N8N_PORTAL_TOKEN) {
    return res.status(500).json({ ok: false, hata: "N8N_PORTAL_TOKEN tanımlı değil." });
  }

  try {
    const r = await fetch(N8N_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Portal-Token": process.env.N8N_PORTAL_TOKEN,
      },
      body: JSON.stringify({
        tc: String(tc),
        tally_submission_id: tally_submission_id || "",
        gonderen: gonderen || "",
      }),
    });

    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { ok: false, hata: `n8n beklenmeyen yanıt döndü (HTTP ${r.status}).` };
    }
    if (r.status === 404) data = { ok: false, hata: "Gönderim servisi şu an kapalı (n8n workflow aktif değil)." };
    if (r.status === 403) data = { ok: false, hata: "n8n token'ı reddetti (N8N_PORTAL_TOKEN yanlış)." };

    return res.status(r.ok ? 200 : r.status).json(data);
  } catch (err) {
    return res.status(502).json({ ok: false, hata: `n8n'e ulaşılamadı: ${err.message}` });
  }
}
