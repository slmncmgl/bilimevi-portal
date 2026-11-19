// Data Tablosu "Danışman Ata" (api/crm-rapor.js islem "ata") testleri
// Çalıştırma: node tests/test_danisman_ata.mjs  (ağa çıkmaz, fetch sahte; e-postalar ve Kylas ID'leri hayali)
import assert from "node:assert/strict";

const PERSONEL = `"Ad Soyad","Şirket","Şube","E-posta","title"
"Ali Admin","Bilimevi","Merkez","ali@x.com","admin"
"Mehmet Müdür","Bilimevi","Kadıköy","mehmet@x.com","manager"
"Nil Özer","Bilimevi","Kadıköy","nil@x.com","staff"
"Nur Alpay","Bilimevi","İzmir","nur@x.com","staff"
"Deneme Kişi","Bilimevi","Kadıköy","deneme@x.com","staff"`;
const ID = `"Email","ID"
"mehmet@x.com","100"
"nil@x.com","101"
"nur@x.com","200"
"deneme@x.com","102"`;
// data id -> sahibi (Kylas'ta). 99 yok.
const SAHIP = { 1: 101, 2: 200, 3: 102, 5: 101, 6: 102 };
const yamalar = [];
let ilk429 = true;

globalThis.fetch = async (url, opts = {}) => {
  url = String(url);
  const yanit = (status, body) => ({ ok: status < 400, status, headers: { get: () => null }, json: async () => body, text: async () => (typeof body === "string" ? body : JSON.stringify(body)) });
  if (url.includes("sheet=Personel")) return yanit(200, PERSONEL);
  if (url.includes("sheet=ID")) return yanit(200, ID);
  if (url.includes("/search/lead")) {
    const idler = JSON.parse(opts.body).jsonRule.rules.find(k => k.field === "id").value;
    const icerik = idler.filter(id => SAHIP[id]).map(id => ({ id, ownerId: SAHIP[id] }));
    return yanit(200, { totalElements: icerik.length, content: icerik });
  }
  const m = url.match(/\/v1\/leads\/(\d+)$/);
  if (m && opts.method === "PATCH") {
    const id = Number(m[1]);
    if (id === 6 && ilk429) { ilk429 = false; return yanit(429, {}); }
    yamalar.push({ id, tip: opts.headers["Content-Type"], govde: JSON.parse(opts.body) });
    if (id === 5) return yanit(500, {});
    return yanit(200, { id });
  }
  throw new Error("beklenmeyen istek " + url);
};
console.warn = () => {};
console.log = (...a) => { if (!String(a[0]).startsWith("[ata]")) process.stdout.write(a.join(" ") + "\n"); };

process.env.SESSION_SECRET = "test-secret";
delete process.env.AUTH_ENFORCE; delete process.env.CRM_YETKI_ENFORCE; // izleme modunda bile yazma zorunlu kontrol edilmeli
const { tokenUret } = await import("../api/_oturum.js");
const crm = (await import("../api/crm-rapor.js")).default;
const res = () => { const r = { code: 200, body: null }; r.status = c => { r.code = c; return r; }; r.json = b => { r.body = b; return r; }; return r; };
async function iste(email, body) {
  const r = res();
  await crm({ method: "POST", body: { islem: "ata", ...body }, headers: email ? { authorization: `Bearer ${tokenUret({ email, name: email })}` } : {} }, r);
  return r;
}

// 1. Oturum yoksa ve staff ise reddedilir (izleme modu yazmayı açmaz)
assert.equal((await iste(null, { leadIds: [1], yeniSahip: 200 })).code, 401);
assert.equal((await iste("nil@x.com", { leadIds: [1], yeniSahip: 200 })).code, 403, "staff atayamaz");
assert.equal(yamalar.length, 0);

// 2. Doğrulamalar
assert.equal((await iste("ali@x.com", { leadIds: [], yeniSahip: 200 })).code, 400);
assert.equal((await iste("ali@x.com", { leadIds: Array.from({ length: 26 }, (_, i) => i + 1), yeniSahip: 200 })).code, 400, "en fazla 25");
assert.equal((await iste("ali@x.com", { leadIds: [1], yeniSahip: 102 })).code, 400, "satış ekibinde olmayana atanmaz");
assert.equal((await iste("ali@x.com", { leadIds: [1], yeniSahip: 999 })).code, 400, "tanımsız kişiye atanmaz");
assert.equal(yamalar.length, 0);

// 3. Admin: bulunamayan, zaten sahibi ve aktarılan ayrılır; PATCH biçimi doğru
let r = await iste("ali@x.com", { leadIds: [1, 2, 99], yeniSahip: 101 });
assert.equal(r.code, 200);
assert.deepEqual(r.body, { aktarilan: [2], zatenSahibi: [1], bulunamayan: [99], hatali: [] });
assert.deepEqual(yamalar, [{ id: 2, tip: "application/json-patch+json", govde: [{ op: "add", path: "/ownerId", value: 101 }] }]);

// 4. Manager: sadece kendi şubesi (Kadıköy: 100, 101, 102)
yamalar.length = 0;
assert.equal((await iste("mehmet@x.com", { leadIds: [2], yeniSahip: 101 })).code, 403, "başka şubenin datası");
assert.equal((await iste("mehmet@x.com", { leadIds: [3], yeniSahip: 200 })).code, 403, "başka şubenin danışmanına");
assert.equal(yamalar.length, 0);
r = await iste("mehmet@x.com", { leadIds: [3], yeniSahip: 101 });
assert.deepEqual(r.body.aktarilan, [3]);

// 5. Kylas hatası raporlanır, 429 tekrar denenir
yamalar.length = 0;
r = await iste("ali@x.com", { leadIds: [5, 6], yeniSahip: 200 });
assert.deepEqual(r.body.hatali, [{ id: 5, hata: "HTTP 500" }]);
assert.deepEqual(r.body.aktarilan, [6], "429 sonrası tekrar denenip aktarılır");

process.stdout.write("Danışman Ata testleri geçti.\n");
