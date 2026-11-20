// v1.0: Danışman adına Kylas'a yazmak için şifreleme + giriş + token önbelleği.
// "_" ile başladığı için Vercel bu dosyayı ayrı adres olarak yayınlamaz.
//
// Şifre saklama: AES-256-GCM. Anahtar process.env.KYLAS_SIFRE_ANAHTARI (base64 ya da hex, 32 bayt). Anahtar yoksa
//   şifreleme/çözme hata verir; çağıran yakalayıp eski yönteme (Selman anahtarı + "[Ad · Portal]") düşer.
// sifrele(duz) -> "v1:<iv b64>:<tag b64>:<ciphertext b64>". coz(paket) -> düz metin.
// Giriş: kylasGiris(email, sifre) -> accessToken (PUT /v1/users/login?view=access-token).
// Token önbelleği: sıcak sunucu örneğinde e-posta başına token saklanır (TOKEN_TTL). 401 gelince gecersiz() ile düşürülür.
import crypto from "node:crypto";

const ETIKET = "v1";
const TOKEN_TTL = 8 * 60 * 1000; // token'ı en fazla bu kadar önbellekte tut (ömrü bilinmiyor, temkinli)
const tokenOnbellek = new Map(); // email -> { token, zaman }

function anahtar() {
  const ham = process.env.KYLAS_SIFRE_ANAHTARI;
  if (!ham) throw new Error("KYLAS_SIFRE_ANAHTARI tanımlı değil.");
  let buf;
  try { buf = Buffer.from(ham, "base64"); } catch { buf = null; }
  if (!buf || buf.length !== 32) {
    const hex = /^[0-9a-fA-F]{64}$/.test(ham.trim()) ? Buffer.from(ham.trim(), "hex") : null;
    buf = hex || buf;
  }
  if (!buf || buf.length !== 32) throw new Error("KYLAS_SIFRE_ANAHTARI 32 baytlık (base64 ya da hex) olmalı.");
  return buf;
}

export function anahtarVar() {
  try { anahtar(); return true; } catch { return false; }
}

export function sifrele(duz) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", anahtar(), iv);
  const ct = Buffer.concat([c.update(String(duz), "utf8"), c.final()]);
  return [ETIKET, iv.toString("base64"), c.getAuthTag().toString("base64"), ct.toString("base64")].join(":");
}

export function coz(paket) {
  const p = String(paket).split(":");
  if (p.length !== 4 || p[0] !== ETIKET) throw new Error("Şifreli paket biçimi tanınmadı.");
  const d = crypto.createDecipheriv("aes-256-gcm", anahtar(), Buffer.from(p[1], "base64"));
  d.setAuthTag(Buffer.from(p[2], "base64"));
  return Buffer.concat([d.update(Buffer.from(p[3], "base64")), d.final()]).toString("utf8");
}

const BAS = v => String(v || "").trim().toLocaleLowerCase("tr-TR");

// E-posta + şifre -> { token } ya da hata. Kylas yanıtında accessToken alanı.
export async function kylasGiris(email, sifre) {
  const r = await fetch("https://api.kylas.io/v1/users/login?view=access-token", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password: sifre }),
  });
  const d = await r.json().catch(() => null);
  if (!r.ok) {
    const e = new Error(d?.message || `Kylas girişi başarısız (HTTP ${r.status})`);
    e.durum = r.status;
    throw e;
  }
  const token = tokenBul(d);
  if (!token) throw new Error("Kylas giriş yanıtında token bulunamadı.");
  return token;
}

function tokenBul(d) {
  if (d && typeof d === "object") {
    for (const k of ["accessToken", "access_token", "token"]) if (typeof d[k] === "string" && d[k]) return d[k];
    for (const v of Object.values(d)) { const x = tokenBul(v); if (x) return x; }
  }
  return null;
}

// Önbellekten ya da yeniden giriş yaparak geçerli token döndürür. sifreGetir: e-posta -> düz şifre (çözülmüş) veren fonksiyon.
export async function kullaniciTokeni(email, sifreCozulmus) {
  const a = BAS(email);
  const k = tokenOnbellek.get(a);
  if (k && Date.now() - k.zaman < TOKEN_TTL) return k.token;
  const token = await kylasGiris(email, sifreCozulmus);
  tokenOnbellek.set(a, { token, zaman: Date.now() });
  return token;
}

export function tokenGecersiz(email) {
  tokenOnbellek.delete(BAS(email));
}
