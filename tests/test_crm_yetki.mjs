// CRM Raporu sunucu rol kontrolü testleri: api/_yetki.js + api/crm-rapor.js v1.3
// Çalıştırma: node tests/test_crm_yetki.mjs  (ağa çıkmaz, fetch sahte; kişiler hayali)
import assert from "node:assert/strict";

const PERSONEL = `"Ad Soyad","Şirket","Şube","E-posta","title"
"Ali Admin","Bilimevi","Merkez","ali@x.com","admin"
"Mehmet Müdür","Bilimevi","Kadıköy","mehmet@x.com","manager"
"Su Satış","Bilimevi","Kadıköy","su@x.com","staff"
"İpek İzmir","Bilimevi","İzmir","ipek@x.com","staff"
"Virgül, Test","Bilimevi","Kadıköy","virgul@x.com","staff"`;
const ID = `"Email","ID"
"mehmet@x.com","100"
"su@x.com","101"
"ipek@x.com","200"
"virgul@x.com","102"`;

const cagrilar = [];
globalThis.fetch = async (url, opts = {}) => {
  url = String(url);
  cagrilar.push({ url, opts });
  const yanit = (status, body) => ({ ok: status < 400, status, json: async () => body, text: async () => (typeof body === "string" ? body : JSON.stringify(body)) });
  if (url.includes("sheet=Personel")) return yanit(200, PERSONEL);
  if (url.includes("sheet=ID")) return yanit(200, ID);
  if (url.includes("/search/lead")) {
    const kurallar = JSON.parse(opts.body).jsonRule.rules;
    const idKurali = kurallar.find(k => k.field === "id");
    if (idKurali) return yanit(200, { totalElements: 1, content: [{ id: idKurali.value, ownerId: idKurali.value === 9 ? 200 : 101 }] });
    return yanit(200, { totalElements: 3, content: [{ id: 1, ownerId: 101, pipelineStage: 222366 }, { id: 2, ownerId: 200, pipelineStage: 222366 }, { id: 3, ownerId: 100, pipelineStage: 218702 }] });
  }
  if (url.includes("/notes/relation")) return yanit(200, { totalElements: 0, content: [], metaData: {} });
  throw new Error("beklenmeyen istek " + url);
};
const loglar = [];
console.warn = m => loglar.push(m);

process.env.SESSION_SECRET = "test-secret";
const { tokenUret } = await import("../api/_oturum.js");
const { csvOku } = await import("../api/_yetki.js");
const crm = (await import("../api/crm-rapor.js")).default;

const res = () => { const r = { code: 200, body: null }; r.status = c => { r.code = c; return r; }; r.json = b => { r.body = b; return r; }; return r; };
const kim = email => (email ? { authorization: `Bearer ${tokenUret({ email, name: email })}` } : {});
async function iste(email, body) { const r = res(); await crm({ method: "POST", body, headers: kim(email) }, r); return r; }

// 0. CSV: tırnak içindeki virgül alanı bölmez
assert.equal(csvOku(PERSONEL).find(p => p["E-posta"] === "virgul@x.com")["Ad Soyad"], "Virgül, Test");

// 1. İzleme modu: kural dışı istek geçer ama loglanır
delete process.env.AUTH_ENFORCE; delete process.env.CRM_YETKI_ENFORCE;
let r = await iste("su@x.com", { islem: "takip", ownerId: 200 });
assert.equal(r.code, 200, "izleme modunda geçmeli");
assert.ok(loglar.some(l => l.includes("[yetki] crm-rapor takip: staff") && l.includes("izleme, geçti")), "loglanmalı");
loglar.length = 0;
r = await iste("su@x.com", { islem: "takip", ownerId: 101 });
assert.equal(r.code, 200); assert.equal(loglar.length, 0, "kendi verisi loglanmamalı");
r = await iste("su@x.com", { kaynak: 2675584, gun: 90 });
assert.deepEqual(Object.keys(r.body.danismanlar).sort(), ["100", "101", "200"], "izleme modunda özet süzülmez");

// 2. Zorunlu mod
process.env.CRM_YETKI_ENFORCE = "1";
const durum = async (email, body) => (await iste(email, body)).code;
// staff
assert.equal(await durum("su@x.com", { islem: "takip", ownerId: 101 }), 200, "staff kendini görür");
assert.equal(await durum("su@x.com", { islem: "takip", ownerId: 100 }), 403, "staff şube arkadaşını göremez");
assert.equal(await durum("su@x.com", { islem: "liste", kaynak: 2675584, ownerIds: [101, 200] }), 403, "listede biri yabancıysa red");
// manager
assert.equal(await durum("mehmet@x.com", { islem: "takip", ownerId: 102 }), 200, "manager şubesini görür");
assert.equal(await durum("mehmet@x.com", { islem: "liste", kaynak: 2675584, ownerIds: [100, 101, 102] }), 200);
assert.equal(await durum("mehmet@x.com", { islem: "takip", ownerId: 200 }), 403, "manager başka şubeyi göremez");
// admin
assert.equal(await durum("ali@x.com", { islem: "takip", ownerId: 200 }), 200, "admin herkesi görür");
// tanımsız ve anonim
assert.equal(await durum("yabanci@x.com", { islem: "takip", ownerId: 101 }), 403, "Personel'de olmayan reddedilir");
assert.equal(await durum(null, { islem: "takip", ownerId: 101 }), 401, "token'sız reddedilir");
assert.equal(await durum(null, { kaynak: 2675584, gun: 90 }), 401, "token'sız özet de reddedilir");

// 3. Özet tablo süzülür
r = await iste("mehmet@x.com", { kaynak: 2675584, gun: 90 });
assert.deepEqual(Object.keys(r.body.danismanlar).sort(), ["100", "101"], "manager sadece Kadıköy'ü alır");
assert.equal(r.body.toplam, 2);
r = await iste("su@x.com", { kaynak: 2675584, gun: 90 });
assert.deepEqual(Object.keys(r.body.danismanlar), ["101"]);
r = await iste("ali@x.com", { kaynak: 2675584, gun: 90 });
assert.equal(Object.keys(r.body.danismanlar).length, 3, "admin hepsini alır");

// 4. Notlar: istekteki ownerId'ye değil lead'in gerçek sahibine bakılır
cagrilar.length = 0;
assert.equal(await durum("su@x.com", { islem: "notlar", leadId: 9, ownerId: 101 }), 403, "başkasının lead'i, ownerId yalan olsa da red");
assert.equal(cagrilar.filter(c => c.url.includes("/notes/")).length, 0, "notlara istek gitmemeli");
assert.equal(await durum("su@x.com", { islem: "notlar", leadId: 5, ownerId: 999 }), 200, "kendi lead'i geçer");
assert.ok(cagrilar.some(c => c.url.includes("targetEntityOwnerId=101")), "gerçek sahip kullanılmalı");

// 5. AUTH_ENFORCE da zorunlu modu açar
delete process.env.CRM_YETKI_ENFORCE; process.env.AUTH_ENFORCE = "1";
assert.equal(await durum("su@x.com", { islem: "takip", ownerId: 100 }), 403);

console.log("Tüm CRM yetki testleri geçti.");
