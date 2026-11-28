// (28.11.2026) Ayrı fonksiyon değil: api/n8n.js ?hedef=wp-hat ile çağrılır (Hobby 12 fonksiyon sınırı).
// v1.0: Yönetici Paneli > WhatsApp hattı. Evolution API'ye n8n "Portal WP Hat Yönetimi" (KQ0SNFXe6eZvs1Lr) üzerinden gider;
// Evolution anahtarı ve N8N_PORTAL_TOKEN tarayıcıya gitmez. Hangi hatlara izin verildiği n8n'deki IZINLI listesinde.
// Hat çıkışı (logout) bağlantıyı kopardığı için geçerli oturum token'ı zorunlu (izleme modunda bile).
import { tokenCoz } from "./_oturum.js";

const N8N = "https://n8n.bilimevi.cloud/webhook/portal-wp-hat";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, hata: "Method not allowed" });
  const origin = req.headers.origin;
  if (origin && origin !== `https://${req.headers.host}` && !origin.startsWith("http://localhost")) {
    return res.status(403).json({ ok: false, hata: "Bu istek portal dışından geldi." });
  }
  const oturum = tokenCoz(req);
  if (!oturum.kullanici && oturum.hata !== "secret_yok") {
    return res.status(401).json({ ok: false, hata: "Oturum doğrulanamadı. Çıkış yapıp tekrar giriş yapın." });
  }
  if (!process.env.N8N_PORTAL_TOKEN) return res.status(500).json({ ok: false, hata: "N8N_PORTAL_TOKEN tanımlı değil." });

  const { hat, islem } = req.body || {};
  try {
    const r = await fetch(N8N, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Portal-Token": process.env.N8N_PORTAL_TOKEN },
      body: JSON.stringify({ hat, islem, kullanici: oturum.kullanici?.email || null }),
    });
    const data = await r.json().catch(() => null);
    if (!r.ok || !data) return res.status(502).json({ ok: false, hata: `n8n cevap vermedi (HTTP ${r.status}).` });
    return res.status(200).json(data);
  } catch {
    return res.status(502).json({ ok: false, hata: "n8n'e ulaşılamadı." });
  }
}
