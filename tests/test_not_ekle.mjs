// Takip Tablosu "Bu dataları ele al" not ekleme (api/crm-rapor.js islem "notEkle") ve portal etiketi testleri
// Çalıştırma: node tests/test_not_ekle.mjs  (ağa çıkmaz, fetch sahte; e-postalar ve Kylas ID'leri hayali)
import assert from "node:assert/strict";

const PERSONEL = `"Ad Soyad","Şirket","Şube","E-posta","title"
"Ali Admin","Bilimevi","Merkez","ali@x.com","admin"
"Mehmet Müdür","Bilimevi","Kadıköy","mehmet@x.com","manager"
"Nil Özer","Bilimevi","Kadıköy","nil@x.com","staff"
"Nur Alpay","Bilimevi","İzmir","nur@x.com","staff"`;
const ID = `"Email","ID"
"mehmet@x.com","100"
"nil@x.com","101"
"nur@x.com","200"`;
const SAHIP = { 1: 101, 2: 200 };
const yazilan = [];
let ilk429 = true;

globalThis.fetch = async (url, opts = {}) => {
  url = String(url);
  const yanit = (status, body) => ({ ok: status < 400, status, headers: { get: () => null }, json: async () => body, text: async () => (typeof body === "string" ? body : JSON.stringify(body)) });
  if (url.includes("sheet=Personel")) return yanit(200, PERSONEL);
  if (url.includes("sheet=ID")) return yanit(200, ID);
  if (url.includes("/search/lead")) {
    const k = JSON.parse(opts.body).jsonRule.rules.find(k => k.field === "id");
    const idler = Array.isArray(k.value) ? k.value : [k.value];
    const icerik = idler.filter(id => SAHIP[id]).map(id => ({ id, ownerId: SAHIP[id] }));
    return yanit(200, { totalElements: icerik.length, content: icerik });
  }
  if (url.endsWith("/v1/notes/relation") && opts.method === "POST") {
    const g = JSON.parse(opts.body);
    if (ilk429 && g.targetEntityId === 2) { ilk429 = false; return yanit(429, {}); }
    yazilan.push(g);
    return yanit(201, { id: 900 + yazilan.length, createdAt: "2026-11-19T10:00:00.000+0000" });
  }
  if (url.includes("/v1/notes/relation?")) {
    return yanit(200, { totalElements: 2, metaData: { idNameStore: { createdBy: { 71430: "Selman", 101: "Nil Özer" } } }, content: [
      { createdAt: "2026-11-19T10:00:00Z", createdBy: 71430, description: "<p>[Nil Özer · Portal] aradım,<br>açmadı &amp; mesaj attım</p>" },
      { createdAt: "2026-11-18T10:00:00Z", createdBy: 101, description: "eski not" },
    ] });
  }
  const ld = url.match(/\/v1\/leads\/(\d+)$/);
  if (ld && !opts.method) {
    const id = Number(ld[1]);
    if (!SAHIP[id]) return yanit(404, {});
    return yanit(200, { id, firstName: "Ece", lastName: "Deneme", ownerId: SAHIP[id], city: "İstanbul", createdAt: "2026-11-01T10:00:00Z", utmCampaign: "Yaz 2027", source: 3024131,
      phoneNumbers: [{ dialCode: "+90", value: "5000000001", primary: false }, { dialCode: "+90", value: "5000000002", primary: true }], emails: [{ value: "ece@ornek.test", primary: true }] });
  }
  throw new Error("beklenmeyen istek " + url);
};
console.warn = () => {};
console.log = (...a) => { if (!String(a[0]).startsWith("[not]")) process.stdout.write(a.join(" ") + "\n"); };

process.env.SESSION_SECRET = "test-secret";
delete process.env.AUTH_ENFORCE; delete process.env.CRM_YETKI_ENFORCE; // izleme modunda bile yazma zorunlu kontrol edilmeli
const { tokenUret } = await import("../api/_oturum.js");
const mod = await import("../api/crm-rapor.js");
const crm = mod.default;
const res = () => { const r = { code: 200, body: null }; r.status = c => { r.code = c; return r; }; r.json = b => { r.body = b; return r; }; return r; };
async function iste(email, body) {
  const r = res();
  await crm({ method: "POST", body, headers: email ? { authorization: `Bearer ${tokenUret({ email, name: email })}` } : {} }, r);
  return r;
}
const not = (email, leadId, metin) => iste(email, { islem: "notEkle", leadId, metin });

// 1. Oturum yok ya da başkasının datası: reddedilir, Kylas'a yazılmaz
assert.equal((await not(null, 1, "deneme")).code, 401);
assert.equal((await not("nur@x.com", 1, "deneme")).code, 403, "staff başkasının datasına yazamaz");
assert.equal((await not("mehmet@x.com", 2, "deneme")).code, 403, "manager başka şubeye yazamaz");
assert.equal(yazilan.length, 0);

// 2. Doğrulamalar
assert.equal((await not("ali@x.com", 1, "  ")).code, 400, "boş not");
assert.equal((await not("ali@x.com", 1, "x".repeat(3001))).code, 400, "çok uzun not");
assert.equal((await not("ali@x.com", 99, "deneme")).code, 404, "olmayan data");
assert.equal(yazilan.length, 0);

// 3. Staff kendi datasına yazar: etiket + HTML kaçış + satır sonu
let r = await not("nil@x.com", 1, "aradım\r\n<b>açmadı</b>");
assert.equal(r.code, 200);
assert.equal(r.body.id, 901);
assert.deepEqual(yazilan[0], { sourceEntity: { description: "[Nil Özer · Portal] aradım<br>&lt;b&gt;açmadı&lt;/b&gt;" }, targetEntityId: 1, targetEntityType: "LEAD" });

// 4. Manager kendi şubesine, admin her yere; 429 tekrar denenir
assert.equal((await not("mehmet@x.com", 1, "müdür notu")).code, 200);
assert.match(yazilan[1].sourceEntity.description, /^\[Mehmet Müdür · Portal\] /);
r = await not("ali@x.com", 2, "admin notu");
assert.equal(r.code, 200, "429 sonrası yazılır");
assert.equal(yazilan[2].targetEntityId, 2);

// 5. Notlar: portal etiketli notta yazan etiketteki ad, metin etiketsiz
r = await iste("ali@x.com", { islem: "notlar", leadId: 1, ownerId: 101, boyut: 10 });
assert.equal(r.code, 200);
assert.deepEqual(r.body.notlar[0], { tarih: "2026-11-19T10:00:00.000Z", yazan: "Nil Özer", metin: "aradım,\naçmadı & mesaj attım", portal: true });
assert.deepEqual(r.body.notlar[1].yazan, "Nil Özer");
assert.equal(r.body.notlar[1].portal, false);
assert.equal((await iste("ali@x.com", { islem: "notlar", leadId: 1, ownerId: 101, boyut: 50 })).code, 400, "en fazla 20");

// 6. Etiket ayrıştırıcı
assert.deepEqual(mod.portalEtiketi("[Ayşe Yılmaz · Portal] merhaba"), { yazan: "Ayşe Yılmaz", metin: "merhaba" });
assert.equal(mod.portalEtiketi("[Ayşe] merhaba"), null);
assert.equal(mod.portalEtiketi("merhaba [Ayşe · Portal]"), null);

// 7. Detay: kişisel veri, izleme modunda bile zorunlu yetki
const detay = (email, leadId) => iste(email, { islem: "detay", leadId });
assert.equal((await detay(null, 1)).code, 401);
assert.equal((await detay("nur@x.com", 1)).code, 403, "staff başkasının datasını göremez");
assert.equal((await detay("mehmet@x.com", 2)).code, 403, "manager başka şubeyi göremez");
assert.equal((await detay("ali@x.com", 99)).code, 404);
r = await detay("nil@x.com", 1);
assert.equal(r.code, 200);
assert.deepEqual(r.body, { id: 1, ad: "Ece Deneme", telefonlar: ["+905000000002", "+905000000001"], epostalar: ["ece@ornek.test"], sehir: "İstanbul",
  ownerId: 101, olusturma: "2026-11-01T10:00:00Z", kampanya: "Yaz 2027", kaynak: 3024131 });

process.stdout.write("Not ekleme ve detay testleri geçti.\n");
