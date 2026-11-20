// Takip Tablosu (api/crm-rapor.js islem "takip") açık liste ve sayılar testi
// Çalıştırma: node tests/test_takip_liste.mjs  (ağa çıkmaz, fetch sahte)
import assert from "node:assert/strict";

const PERSONEL = `"Ad Soyad","Şirket","Şube","E-posta","title"
"Ali Admin","Bilimevi","Merkez","ali@x.com","admin"`;
const gun = n => new Date(Date.now() + n * 86400000).toISOString();
const ILGILI = 218702, NA1 = 222366, GORUSME = 218701;
const LEADLER = [
  { id: 1, ownerId: 7, pipelineStage: ILGILI, taskDueOn: gun(3), latestActivityCreatedAt: gun(-1), source: 2650986 },   // zorunlu, ileri
  { id: 2, ownerId: 7, pipelineStage: ILGILI, taskDueOn: gun(-2), latestActivityCreatedAt: gun(-5), source: 2650986 },  // zorunlu, gecikmiş
  { id: 3, ownerId: 7, pipelineStage: ILGILI, taskDueOn: null, latestActivityCreatedAt: gun(-1), source: 2650986 },     // zorunlu, task yok -> takipsiz
  { id: 4, ownerId: 7, pipelineStage: NA1, taskDueOn: null, latestActivityCreatedAt: gun(-30), source: 2674021 },       // zorunlu değil, sessiz -> takipsiz
  { id: 5, ownerId: 7, pipelineStage: GORUSME, taskDueOn: null, latestActivityCreatedAt: gun(-1), source: 2674021 },    // VIP olmayan görüşme, yeni etkinlik
  { id: 6, ownerId: 7, pipelineStage: ILGILI, taskDueOn: null, latestActivityCreatedAt: gun(-1), source: 2650986 },     // taskDueOn boş ama gerçek ileri task var
];
// Gerçek açık task listesi (tumTasklar). Lead 6'nın taskDueOn'u boş ama ileri task'ı var -> takipsiz SAYILMAMALI.
const TASKLAR = [
  { id: 101, status: 2614526, dueDate: gun(3), relation: [{ targetEntityType: "LEAD", targetEntityId: 1 }] },
  { id: 102, status: 2614526, dueDate: gun(-2), relation: [{ targetEntityType: "LEAD", targetEntityId: 2 }] },
  { id: 103, status: 2614526, dueDate: gun(5), relation: [{ targetEntityType: "LEAD", targetEntityId: 6 }] },
  { id: 104, status: 2614528, dueDate: gun(4), relation: [{ targetEntityType: "LEAD", targetEntityId: 3 }] }, // tamamlanmış, sayılmaz
];
globalThis.fetch = async (url, opts = {}) => {
  url = String(url);
  const yanit = (status, body) => ({ ok: status < 400, status, headers: { get: () => null }, json: async () => body, text: async () => (typeof body === "string" ? body : JSON.stringify(body)) });
  if (url.includes("sheet=Personel")) return yanit(200, PERSONEL);
  if (url.includes("sheet=ID")) return yanit(200, `"Email","ID"`);
  if (url.includes("/search/lead")) return yanit(200, { totalElements: LEADLER.length, content: LEADLER });
  if (url.includes("/v1/tasks?page=")) return yanit(200, { content: TASKLAR, totalPages: 1 });
  throw new Error("beklenmeyen istek " + url);
};
console.warn = () => {};
process.env.SESSION_SECRET = "test-secret";
process.env.KYLAS_ISTEK_HIZI = "1000";
const { tokenUret } = await import("../api/_oturum.js");
const crm = (await import("../api/crm-rapor.js")).default;
const r = { code: 200 }; r.status = c => { r.code = c; return r; }; r.json = b => { r.body = b; return r; };
await crm({ method: "POST", body: { islem: "takip", ownerIds: [7], sessizGun: 14 }, headers: { authorization: `Bearer ${tokenUret({ email: "ali@x.com", name: "Ali" })}` } }, r);
assert.equal(r.code, 200);
const { ozet, acik } = r.body;
assert.equal(acik.length, ozet.toplam, "açık liste tüm açık datalar");
const bul = id => acik.find(l => l.id === id);
assert.equal(bul(1).taskTur, "ileri"); assert.equal(bul(1).zorunlu, true); assert.equal(bul(1).takipsiz, false);
assert.equal(bul(2).taskTur, "gecikmis");
assert.equal(bul(3).taskTur, "yok"); assert.equal(bul(3).takipsiz, true);
assert.equal(bul(4).zorunlu, false); assert.equal(bul(4).takipsiz, true);
assert.equal(bul(5).takipsiz, false);
assert.equal(bul(6).taskTur, "ileri", "gerçek task listesinden ileri");
assert.equal(bul(6).takipsiz, false, "ileri tarihli açık task'ı olan data takipsiz değil");
assert.equal(bul(3).taskTur, "yok", "tamamlanmış task sayılmaz");
// Kart sayıları listeden süzülenle aynı
assert.equal(acik.filter(l => l.zorunlu).length, ozet.taskBeklenen);
assert.equal(acik.filter(l => l.zorunlu && l.taskTur === "ileri").length, ozet.ileriTask);
assert.equal(acik.filter(l => l.zorunlu && l.taskTur === "gecikmis").length, ozet.gecikmisTask);
assert.equal(acik.filter(l => l.takipsiz).length, ozet.takipsiz);
assert.equal(r.body.takipsiz, undefined, "eski ayrı liste yok");
process.stdout.write("Takip listesi testleri geçti.\n");
