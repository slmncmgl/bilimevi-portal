// v1.0: Danışmanların Kylas bağlantıları (admin-only). Selman e-posta+şifre girer; sunucu Kylas'a giriş yapıp doğrular,
// şifreyi AES-256-GCM ile şifreler (KYLAS_SIFRE_ANAHTARI), n8n "Kylas Bağlantıları" workflow'una (X-Portal-Token) yazdırır.
// Düz şifre hiçbir yere kaydedilmez, tarayıcıya geri dönmez, log'a düşmez.
//   POST { islem:"kaydet", girdiler:[{email,sifre}] } -> her satır için { email, ok, ad?, kylasId?, hata? }
//   POST { islem:"durum", epostalar:[...] }           -> { durum: { email: { bagli, ad, guncelleme } } }
//   POST { islem:"sil", email }                       -> bağlantıyı pasif yapar
import { oturumKontrol, tokenCoz } from "./_oturum.js";
import { yetkiBul } from "./_yetki.js";
import { sifrele, anahtarVar, kylasGiris } from "./_kylasKullanici.js";

const N8N = "https://n8n.bilimevi.cloud/webhook";
const EN_FAZLA = 60;

async function n8nKaydet(headers, satir) {
  const r = await fetch(`${N8N}/kylas-baglanti-kaydet`, { method: "POST", headers, body: JSON.stringify(satir) });
  if (!r.ok) throw new Error(`Saklanamadı (n8n HTTP ${r.status})`);
}
async function n8nGetir(headers, email) {
  const r = await fetch(`${N8N}/kylas-baglanti-getir?email=${encodeURIComponent(email)}`, { headers });
  if (!r.ok) throw new Error(`Okunamadı (n8n HTTP ${r.status})`);
  return (await r.json().catch(() => ({})))?.baglanti || null;
}

// Token'la kimlik (id + ad) oku
async function kylasKimlik(token) {
  const r = await fetch("https://api.kylas.io/v1/users/me", { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
  if (!r.ok) throw new Error(`Kimlik okunamadı (HTTP ${r.status})`);
  const d = await r.json();
  return { id: d.id, ad: [d.firstName, d.lastName].filter(Boolean).join(" ") };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const origin = req.headers.origin;
  if (origin && origin !== `https://${req.headers.host}` && !origin.startsWith("http://localhost")) {
    return res.status(403).json({ error: "Bu istek portal dışından geldi." });
  }
  if (!oturumKontrol(req, res, "kylas-baglanti")) return;
  const yetki = await yetkiBul(req);
  if (yetki.tur !== "admin") {
    const t = tokenCoz(req);
    return res.status(403).json({ error: "Bu işlem sadece yöneticilere açık.",
      tani: { tur: yetki.tur, tokenHata: t.hata || null, gorulenEmail: t.kullanici?.email || null } });
  }
  if (!process.env.N8N_PORTAL_TOKEN) return res.status(500).json({ error: "N8N_PORTAL_TOKEN tanımlı değil." });
  if (!anahtarVar()) return res.status(500).json({ error: "KYLAS_SIFRE_ANAHTARI tanımlı değil (Vercel ortam değişkeni)." });
  const headers = { "Content-Type": "application/json", "X-Portal-Token": process.env.N8N_PORTAL_TOKEN };
  const islem = req.body?.islem;

  try {
    if (islem === "kaydet") {
      const girdiler = Array.isArray(req.body?.girdiler) ? req.body.girdiler : [];
      if (!girdiler.length || girdiler.length > EN_FAZLA) return res.status(400).json({ error: `1-${EN_FAZLA} satır girin.` });
      const sonuc = [];
      for (const g of girdiler) {
        const email = String(g?.email || "").trim().toLowerCase();
        const sifre = String(g?.sifre || "");
        if (!email || !sifre) { sonuc.push({ email, ok: false, hata: "E-posta ve şifre gerekli." }); continue; }
        try {
          const token = await kylasGiris(email, sifre);          // doğrular
          const { id, ad } = await kylasKimlik(token);
          await n8nKaydet(headers, { email, kylasId: String(id ?? ""), ad, sifreli: sifrele(sifre), durum: "aktif" });
          sonuc.push({ email, ok: true, ad, kylasId: id });
        } catch (e) {
          sonuc.push({ email, ok: false, hata: e.durum === 401 ? "E-posta ya da şifre yanlış." : e.message });
        }
      }
      return res.status(200).json({ sonuc });
    }

    if (islem === "durum") {
      const epostalar = (Array.isArray(req.body?.epostalar) ? req.body.epostalar : []).map(e => String(e || "").trim().toLowerCase()).filter(Boolean).slice(0, 200);
      const durum = {};
      for (const email of epostalar) {
        const b = await n8nGetir(headers, email);
        durum[email] = b ? { bagli: true, ad: b.ad, guncelleme: b.guncelleme } : { bagli: false };
      }
      return res.status(200).json({ durum });
    }

    if (islem === "sil") {
      const email = String(req.body?.email || "").trim().toLowerCase();
      if (!email) return res.status(400).json({ error: "E-posta gerekli." });
      await n8nKaydet(headers, { email, kylasId: "", ad: "", sifreli: "silindi", durum: "pasif" });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Geçersiz işlem." });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
