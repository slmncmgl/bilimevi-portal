// Kylas hız sınırı (api/crm-rapor.js kylasIstek ve notlar) testleri
// Çalıştırma: node tests/test_kylas_hiz.mjs  (ağa çıkmaz, fetch sahte; yaklaşık 25 sn sürer)
import assert from "node:assert/strict";

const PERSONEL = `"Ad Soyad","Şirket","Şube","E-posta","title"
"Ali Admin","Bilimevi","Merkez","ali@x.com","admin"`;
const ID = `"Email","ID"`;
const zamanlar = [];
let mod429 = 0; // > 0 ise bu kadar istek 429 döner
let hep429 = false;

globalThis.fetch = async (url, opts = {}) => {
  url = String(url);
  const yanit = (status, body) => ({ ok: status < 400, status, headers: { get: () => null }, json: async () => body, text: async () => (typeof body === "string" ? body : JSON.stringify(body)) });
  if (url.includes("sheet=Personel")) return yanit(200, PERSONEL);
  if (url.includes("sheet=ID")) return yanit(200, ID);
  if (url.includes("api.kylas.io")) {
    zamanlar.push(Date.now());
    if (hep429) return yanit(429, {});
    if (mod429 > 0) { mod429--; return yanit(429, {}); }
    if (url.includes("/notes/relation?")) return yanit(200, { totalElements: 1, content: [{ createdAt: "2026-11-19T10:00:00Z", createdBy: 1, description: "not" }], metaData: {} });
    return yanit(200, { ok: true });
  }
  throw new Error("beklenmeyen istek " + url);
};
console.warn = () => {};

process.env.SESSION_SECRET = "test-secret";
delete process.env.KYLAS_ISTEK_HIZI;
const { tokenUret } = await import("../api/_oturum.js");
const mod = await import("../api/crm-rapor.js");
const crm = mod.default;
const res = () => { const r = { code: 200, body: null }; r.status = c => { r.code = c; return r; }; r.json = b => { r.body = b; return r; }; return r; };
const hdr = { authorization: `Bearer ${tokenUret({ email: "ali@x.com", name: "Ali" })}` };
async function iste(body) { const r = res(); await crm({ method: "POST", body, headers: hdr }, r); return r; }

// 1. 20 istek art arda: ilk 4 hemen, kalanlar saniyede ~2,2 (toplam en az ~7 sn), sıra korunur
const bas = Date.now();
const sira = [];
await Promise.all(Array.from({ length: 20 }, (_, i) => mod.kylasIstek("https://api.kylas.io/v1/x").then(() => sira.push(i))));
const sure = Date.now() - bas;
assert.ok(sure >= 6800, `20 istek çok hızlı gitti: ${sure} ms`);
assert.ok(sure < 9500, `20 istek çok yavaş: ${sure} ms`);
assert.deepEqual(sira, Array.from({ length: 20 }, (_, i) => i), "sıra korunur");
const birSaniyede = zamanlar.filter(t => t >= bas + 2000 && t < bas + 3000).length;
assert.ok(birSaniyede <= 3, `saniyede en fazla ~2-3 istek, gelen ${birSaniyede}`);

// 2. 429 iki kez gelirse tekrar denenir ve not listesi döner
await new Promise(r => setTimeout(r, 2000)); // kova dolsun
mod429 = 2;
let r = await iste({ islem: "notlar", leadId: 1, ownerId: 1 });
assert.equal(r.code, 200, "429 sonrası tekrar denenip başarılı olur");
assert.equal(r.body.notlar.length, 1);

// 3. Aynı not isteği 45 sn içinde Kylas'a gitmez (önbellek)
const once = zamanlar.length;
r = await iste({ islem: "notlar", leadId: 1, ownerId: 1 });
assert.equal(r.code, 200);
assert.equal(zamanlar.length, once, "önbellekten döner");

// 4. Kylas hep 429 verirse kullanıcıya 503 ve anlaşılır mesaj (HTTP 429 değil)
hep429 = true;
r = await iste({ islem: "notlar", leadId: 2, ownerId: 1 });
assert.equal(r.code, 503);
assert.match(r.body.error, /yoğun/);
hep429 = false;

process.stdout.write("Kylas hız sınırı testleri geçti.\n");
