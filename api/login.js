// v1.0 (Güvenlik Faz 1): kullanıcı adı + şifre ile oturum token'ı verir
// Giriş ekranı eskisi gibi Login Servisi'ne (Apps Script) doğrudan gider; bu fonksiyon girişten sonra
// arka planda çağrılır. Şifreyi aynı Apps Script'e sunucudan tekrar doğrulatır, doğruysa imzalı token döner.
// Bu fonksiyon hata verse bile kullanıcının girişi etkilenmez (izleme modu).
import { LOGIN_SCRIPT_URL } from "../src/config.js";
import { tokenUret } from "./_oturum.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Kullanıcı adı ve şifre gerekli." });
  if (!process.env.SESSION_SECRET) return res.status(503).json({ error: "SESSION_SECRET tanımlı değil." });

  try {
    const r = await fetch(LOGIN_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "loginWithKullaniciAdi", username, password }),
    });
    const json = await r.json();
    const personel = json?.personel;
    if (!json?.success || !personel) return res.status(401).json({ error: "Giriş doğrulanamadı." });

    const token = tokenUret({ email: personel["E-posta"] || username, name: personel["Ad Soyad"] });
    return res.status(200).json({ token });
  } catch (err) {
    return res.status(502).json({ error: `Login servisine ulaşılamadı: ${err.message}` });
  }
}
