// Takip Tablosu "Hatırlat" (api/crm-rapor.js islem "hatirlat") testleri
// Çalıştırma: node tests/test_hatirlat.mjs  (ağa çıkmaz, fetch sahte; kişiler ve ID'ler hayali)
import assert from "node:assert/strict";

const PERSONEL = `"Ad Soyad","Şube","E-posta","title"
"Ali Admin","Merkez","ali@x.com","admin"
"Deniz Direktör","Merkez","deniz@x.com","director"
"Oya Owner","Merkez","oya@x.com","owner"
"Mehmet Müdür","Kadıköy","mehmet@x.com","manager"
"Nil Özer","Kadıköy","nil@x.com","staff"`;
const ID = `"Email","ID"
"nil@x.com","101"`;
const giden = [];
let n8nKod = 200, asama = 218702, sahip = 101, kopuk = false;

globalThis.fetch = async (url, opts = {}) => {
  url = String(url);
  const yanit = (status, body) => ({ ok: status < 400, status, headers: { get: () => null }, json: async () => body, text: async () => body });
  if (url.includes("sheet=Personel")) return yanit(200, PERSONEL);
  if (url.includes("sheet=ID")) return yanit(200, ID);
  if (url.includes("/search/lead")) return yanit(200, { content: [{ id: 1, firstName: "Test", lastName: "Data", ownerId: sahip, source: 2614512, latestActivityCreatedAt: new Date(Date.now() - 3 * 86400000).toISOString(), pipelineStage: asama }] });
  if (url.endsWith("/data-hatirlat")) {
    if (kopuk) throw new Error("kopuk");
    giden.push({ govde: JSON.parse(opts.body), token: opts.headers["X-Portal-Token"] });
    return yanit(n8nKod, n8nKod === 200 ? { alici: "Nil Özer", hat: "Test", metin: "Merhaba" } : { error: "hata" });
  }
  throw new Error("beklenmeyen istek " + url);
};
console.warn = () => {};
const yaz = console.log;
console.log = () => {};
process.env.KYLAS_ISTEK_HIZI = "1000";
process.env.SESSION_SECRET = "test-secret";
process.env.N8N_PORTAL_TOKEN = "test-token";
delete process.env.AUTH_ENFORCE; delete process.env.CRM_YETKI_ENFORCE;
const { tokenUret } = await import("../api/_oturum.js");
const crm = (await import("../api/crm-rapor.js")).default;

async function iste(email, ek = {}) {
  const r = { code: 200, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
  await crm({ method: "POST", headers: email ? { authorization: `Bearer ${tokenUret({ email })}` } : {}, body: { islem: "hatirlat", leadId: 1, ...ek } }, r);
  return r;
}

assert.equal((await iste(null)).code, 401);
for (const e of ["mehmet@x.com", "nil@x.com", "yabanci@x.com"]) assert.equal((await iste(e)).code, 403);
assert.equal(giden.length, 0);
for (const e of ["ali@x.com", "deniz@x.com", "oya@x.com"]) assert.equal((await iste(e)).code, 200);
assert.equal(giden[0].govde.onizleme, true);
assert.equal(giden[0].token, "test-token");
assert.equal(giden[0].govde.data.kaynak, "Referans");
assert.equal(giden[0].govde.data.sonAktivite, "3 gün önce");
await iste("ali@x.com", { gonderen: "Oya Owner", danisman: "Başkası" });
assert.equal(giden.at(-1).govde.gonderen, "Ali Admin");
assert.equal(giden.at(-1).govde.danisman, "Nil Özer");
assert.equal((await iste("ali@x.com", { onizleme: false, beklenenSahip: 999 })).code, 409);
assert.equal((await iste("ali@x.com", { onizleme: false, beklenenSahip: 101 })).code, 200);
assert.equal(giden.at(-1).govde.onizleme, false);
assert.equal((await iste("ali@x.com", { not: "x".repeat(301) })).code, 400);
assert.equal((await iste("ali@x.com", { leadId: "abc" })).code, 400);
n8nKod = 409; assert.equal((await iste("ali@x.com")).code, 409);
n8nKod = 403; assert.equal((await iste("ali@x.com")).code, 502);
n8nKod = 200; kopuk = true; assert.equal((await iste("ali@x.com")).code, 502);
kopuk = false; asama = 217287; assert.equal((await iste("ali@x.com")).code, 422);
asama = 218702; sahip = 555; assert.equal((await iste("ali@x.com")).code, 422);
yaz("hatirlat: tüm senaryolar geçti");
