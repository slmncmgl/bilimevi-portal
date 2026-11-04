// v1.0 (Güvenlik Faz 1): portal oturum anahtarı (token) üretimi ve kontrolü
// "_" ile başladığı için Vercel bu dosyayı ayrı bir adres olarak yayınlamaz, sadece diğer fonksiyonlar kullanır.
//
// Token biçimi: base64url(JSON) + "." + base64url(HMAC-SHA256 imzası)
// İmza anahtarı Vercel env: SESSION_SECRET. Tanımlı değilse token üretilmez, kontrol "izleme" modunda kalır.
// AUTH_ENFORCE=1 olursa token'sız ya da geçersiz token'lı istekler reddedilir. Olmadıkça sadece loglanır.
import crypto from "node:crypto";

const SURE_MS = 7 * 24 * 60 * 60 * 1000; // 7 gün: açık sekmeler token süresi dolduğu için kesilmesin

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function imzala(veri) {
  return b64url(crypto.createHmac("sha256", process.env.SESSION_SECRET).update(veri).digest());
}

export function tokenUret({ email, name }) {
  if (!process.env.SESSION_SECRET || !email) return null;
  const veri = b64url(JSON.stringify({ email: String(email).toLowerCase(), name: name || "", exp: Date.now() + SURE_MS }));
  return `${veri}.${imzala(veri)}`;
}

// Dönüş: { kullanici } ya da { hata: "token_yok" | "token_gecersiz" | "token_suresi_doldu" | "secret_yok" }
export function tokenCoz(req) {
  if (!process.env.SESSION_SECRET) return { hata: "secret_yok" };
  const baslik = req.headers.authorization || "";
  const token = baslik.startsWith("Bearer ") ? baslik.slice(7).trim() : "";
  if (!token) return { hata: "token_yok" };

  const [veri, imza] = token.split(".");
  if (!veri || !imza) return { hata: "token_gecersiz" };
  const beklenen = imzala(veri);
  if (imza.length !== beklenen.length || !crypto.timingSafeEqual(Buffer.from(imza), Buffer.from(beklenen))) {
    return { hata: "token_gecersiz" };
  }

  let kullanici;
  try {
    kullanici = JSON.parse(Buffer.from(veri.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  } catch {
    return { hata: "token_gecersiz" };
  }
  if (!kullanici.exp || kullanici.exp < Date.now()) return { hata: "token_suresi_doldu" };
  return { kullanici };
}

// Fonksiyonların başında çağrılır. false dönerse cevap gönderilmiştir, fonksiyon durmalı.
// İzleme modunda her sorunlu isteği Vercel loglarına "[oturum]" önekiyle yazar ve devam eder.
export function oturumKontrol(req, res, kaynak) {
  const sonuc = tokenCoz(req);
  if (sonuc.kullanici) return true;

  const zorunlu = process.env.AUTH_ENFORCE === "1" && sonuc.hata !== "secret_yok";
  console.warn(`[oturum] ${kaynak}: ${sonuc.hata} (${zorunlu ? "reddedildi" : "izleme, geçti"})`);
  if (!zorunlu) return true;

  res.status(401).json({ error: "Oturum doğrulanamadı. Lütfen çıkış yapıp tekrar giriş yapın.", kod: sonuc.hata });
  return false;
}
