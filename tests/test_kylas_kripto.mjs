// _kylasKullanici.js şifreleme testleri (ağa çıkmaz)
// Çalıştırma: node tests/test_kylas_kripto.mjs
import assert from "node:assert/strict";
import crypto from "node:crypto";

process.env.KYLAS_SIFRE_ANAHTARI = crypto.randomBytes(32).toString("base64");
const { sifrele, coz, anahtarVar } = await import("../api/_kylasKullanici.js");

// 1. Gidiş-dönüş: şifrele sonra çöz, aynı metin
const sir = "Zeyn€p!_çŞ_123 boşluklu ve ünlü ö";
const paket = sifrele(sir);
assert.ok(paket.startsWith("v1:"), "paket v1 ile başlar");
assert.ok(!paket.includes(sir), "düz şifre pakette görünmez");
assert.equal(coz(paket), sir, "çözülen metin aynı");

// 2. Her şifrelemede farklı çıktı (rastgele IV), ikisi de aynı metne çözülür
const p2 = sifrele(sir);
assert.notEqual(paket, p2, "aynı metin farklı pakete şifrelenir");
assert.equal(coz(p2), sir);

// 3. Kurcalanan paket çözülmez (GCM auth tag)
const parca = paket.split(":");
const ct = Buffer.from(parca[3], "base64"); ct[0] ^= 1;
parca[3] = ct.toString("base64");
assert.throws(() => coz(parca.join(":")), "kurcalanan ciphertext reddedilir");

// 4. Yanlış anahtar çözemez
const dogruPaket = sifrele(sir);
process.env.KYLAS_SIFRE_ANAHTARI = crypto.randomBytes(32).toString("base64");
const { coz: coz2 } = await import("../api/_kylasKullanici.js?yeni=1");
assert.throws(() => coz2(dogruPaket), "başka anahtarla çözülemez");

// 5. Anahtar yoksa anahtarVar false, sifrele hata
delete process.env.KYLAS_SIFRE_ANAHTARI;
const { anahtarVar: av3, sifrele: s3 } = await import("../api/_kylasKullanici.js?yeni=2");
assert.equal(av3(), false, "anahtar yoksa anahtarVar false");
assert.throws(() => s3("x"), "anahtar yoksa şifrele hata");

// 6. Hex anahtar da kabul (64 hex = 32 bayt)
process.env.KYLAS_SIFRE_ANAHTARI = crypto.randomBytes(32).toString("hex");
const { sifrele: s4, coz: c4 } = await import("../api/_kylasKullanici.js?yeni=3");
assert.equal(c4(s4("hex-anahtar-testi")), "hex-anahtar-testi");

process.stdout.write("Kylas şifreleme testleri geçti.\n");
