// v1.0: Yönetici Paneli > Kullanıcı Yönetimi > Test Login
// Admin/owner başka bir kullanıcının hesabıyla (yan sekmede) giriş yapar. Şifre tarayıcıya hiç gitmez:
// bu fonksiyon şifreyi İzin Yönetimi sheet'inin Login sekmesinden okur, Login Servisi'ne (Apps Script) normal
// giriş isteği atar ve dönen kullanıcı bilgisini + o kişiye ait oturum token'ını döndürür.
//
// Yetki kontrolü baştan ZORUNLU (AUTH_ENFORCE'tan bağımsız): geçerli token + Personel'de title admin/owner.
// Her kullanım Vercel loglarına "[test-login]" önekiyle yazılır. Girişler sekmesine kayıt atılmaz.
import { LOGIN_SCRIPT_URL } from "../src/config.js";
import { tokenCoz, tokenUret } from "./_oturum.js";
import { csvOku, dizinGetir, kucuk } from "./_yetki.js";

const SHEET_ID = "1jS9yt_wIrL-JXbstqtrG9nML0nalRmOkSarpIbOLCxA";
const IZINLI_ROLLER = ["admin", "owner"];

// Login sekmesinde "Kullanıcı Adı" ve "Şifre" başlıkları iki kez geçiyor (ikinci blok danışman bilgisi).
// csvOku aynı adlı başlıklarda sonuncuyu tutacağı için tekrar eden başlıklar "#sıra" ekiyle ayrıştırılır;
// ilk (asıl) sütunlar adını korur.
async function loginSatirlari() {
  const r = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Login`);
  if (!r.ok) throw new Error(`Login sekmesi okunamadı (HTTP ${r.status})`);
  const metin = await r.text();
  const son = metin.indexOf("\n");
  const baslik = metin.slice(0, son).split('","').map(h => h.replace(/^"|"\r?$/g, "").trim());
  const gorulen = new Set();
  const tekil = baslik.map((h, i) => {
    if (!h || gorulen.has(h)) return `${h}#${i}`;
    gorulen.add(h);
    return h;
  });
  return csvOku(tekil.map(h => `"${h}"`).join(",") + metin.slice(son));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { kullanici } = tokenCoz(req);
  if (!kullanici?.email) {
    return res.status(401).json({ error: "Oturum anahtarın yok ya da süresi dolmuş. Çıkış yapıp tekrar giriş yap." });
  }

  try {
    const dizin = await dizinGetir();
    const ben = dizin.kisiler.get(kucuk(kullanici.email));
    if (!ben || !IZINLI_ROLLER.includes(ben.rol)) {
      console.warn(`[test-login] reddedildi: ${kullanici.email} (rol: ${ben?.rol || "yok"})`);
      return res.status(403).json({ error: "Test login sadece admin ve owner için." });
    }

    const hedefEmail = kucuk(req.body?.email);
    if (!hedefEmail) return res.status(400).json({ error: "Kullanıcı e-postası gerekli." });

    const satir = (await loginSatirlari()).find(s => kucuk(s["E-posta"]) === hedefEmail);
    if (!satir?.["Kullanıcı Adı"] || !satir?.["Şifre"]) {
      return res.status(404).json({ error: "Bu kişinin Login sekmesinde kullanıcı adı ya da şifresi yok." });
    }

    const r = await fetch(LOGIN_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "loginWithKullaniciAdi", username: satir["Kullanıcı Adı"], password: satir["Şifre"] }),
    });
    const json = await r.json();
    if (!json?.success || !json.personel) {
      return res.status(502).json({ error: json?.msg || "Login Servisi girişi kabul etmedi." });
    }

    console.warn(`[test-login] ${ben.ad} (${kullanici.email}) → ${json.personel["Ad Soyad"]} (${hedefEmail})`);
    const token = tokenUret({ email: json.personel["E-posta"] || hedefEmail, name: json.personel["Ad Soyad"] });
    return res.status(200).json({
      personel: json.personel,
      modulRow: json.modulRow || null,
      phone: json.phone || "",
      token,
      acan: ben.ad,
    });
  } catch (err) {
    return res.status(502).json({ error: `Test login yapılamadı: ${err.message}` });
  }
}
