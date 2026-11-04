// v1.1 (Güvenlik Faz 1): izin listesi + oturum kontrolü
// - Sadece portalın kullandığı işlemler geçer (InstagramDM: lead oluştur, not ekle). Silme, okuma, güncelleme kapalı.
//   Yeni bir sayfa Kylas'a başka bir işlem yaptıracaksa IZINLI listesine bilerek eklenir.
// - Oturum token'ı _oturum.js ile kontrol edilir (AUTH_ENFORCE=1 olana kadar sadece loglanır).
import { oturumKontrol } from "./_oturum.js";

const IZINLI = [
  { method: "POST", path: /^leads\/?$/ },
  { method: "POST", path: /^notes\/relation\/?$/ },
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const KYLAS_API_KEY = process.env.KYLAS_API_KEY;
  const { path, method, body } = req.body || {};

  if (!path) {
    return res.status(400).json({ error: "path parametresi gerekli" });
  }

  const istenenMethod = String(method || "GET").toUpperCase();
  const izinli = IZINLI.some(k => k.method === istenenMethod && k.path.test(String(path)));
  if (!izinli) {
    console.warn(`[kylas] izin listesinde yok, reddedildi: ${istenenMethod} ${String(path).slice(0, 80)}`);
    return res.status(403).json({ error: "Bu Kylas işlemine portal üzerinden izin verilmiyor." });
  }

  if (!oturumKontrol(req, res, "kylas")) return;

  try {
    const response = await fetch(`https://api.kylas.io/v1/${path}`, {
      method: istenenMethod,
      headers: {
        "api-key": KYLAS_API_KEY,
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
