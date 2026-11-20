// Toplu Data Follow Up task işlemleri (api/crm-rapor.js: tasklar, taskEkle, taskTamamla) testleri
// Çalıştırma: node tests/test_task.mjs  (ağa çıkmaz, fetch sahte; e-postalar ve Kylas ID'leri hayali)
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
const gun = n => new Date(Date.now() + n * 86400000).toISOString();
const TASKLAR = [
  { id: 11, name: "Ara", type: 2614522, status: 2614526, dueDate: gun(-2), assignedTo: 101, createdBy: 101, relation: [{ targetEntityType: "LEAD", targetEntityId: 1 }] },
  { id: 12, name: "Sonra", type: 2614523, status: 2614526, dueDate: gun(3), assignedTo: 101, createdBy: 71430, description: "<p>[Mehmet Müdür · Portal]</p>", relation: [{ targetEntityType: "LEAD", targetEntityId: 1 }] },
  { id: 13, name: "Eski", type: 2614525, status: 2614528, dueDate: gun(-9), completedAt: gun(-8), assignedTo: 101, relation: [{ targetEntityType: "LEAD", targetEntityId: 1 }] },
  { id: 21, name: "Başka", type: 2614522, status: 2614526, dueDate: gun(1), assignedTo: 200, relation: [{ targetEntityType: "LEAD", targetEntityId: 2 }] },
];
const yazilan = [];
let taskSayfaIstegi = 0;

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
  if (url.includes("/v1/tasks?page=")) { taskSayfaIstegi++; return yanit(200, { content: TASKLAR, totalPages: 1 }); }
  if (url.endsWith("/v1/tasks/") && opts.method === "POST") { const g = JSON.parse(opts.body); yazilan.push({ tip: "POST", g }); return yanit(201, { id: 99, ...g, createdBy: 71430 }); }
  const m = url.match(/\/v1\/tasks\/(\d+)$/);
  if (m && !opts.method) { const t = TASKLAR.find(x => x.id === Number(m[1])); return t ? yanit(200, t) : yanit(404, {}); }
  if (m && opts.method === "PUT") { const g = JSON.parse(opts.body); yazilan.push({ tip: "PUT", id: Number(m[1]), g }); return yanit(200, { id: Number(m[1]), ...g, completedAt: gun(0) }); }
  throw new Error("beklenmeyen istek " + url);
};
console.warn = () => {};
console.log = (...a) => { if (!String(a[0]).startsWith("[task]")) process.stdout.write(a.join(" ") + "\n"); };

process.env.SESSION_SECRET = "test-secret";
delete process.env.AUTH_ENFORCE; delete process.env.CRM_YETKI_ENFORCE;
const { tokenUret } = await import("../api/_oturum.js");
const crm = (await import("../api/crm-rapor.js")).default;
const res = () => { const r = { code: 200, body: null }; r.status = c => { r.code = c; return r; }; r.json = b => { r.body = b; return r; }; return r; };
async function iste(email, body) {
  const r = res();
  await crm({ method: "POST", body, headers: email ? { authorization: `Bearer ${tokenUret({ email, name: email })}` } : {} }, r);
  return r;
}

// 1. Liste: yetki zorunlu, sadece o datanın task'ları; açıklar tarihe göre önce, portal etiketi ayrışır
assert.equal((await iste(null, { islem: "tasklar", leadId: 1 })).code, 401);
assert.equal((await iste("nur@x.com", { islem: "tasklar", leadId: 1 })).code, 403);
let r = await iste("nil@x.com", { islem: "tasklar", leadId: 1 });
assert.equal(r.code, 200);
assert.deepEqual(r.body.tasklar.map(t => t.id), [11, 12, 13]);
assert.equal(r.body.tasklar[0].gecikmis, true);
assert.equal(r.body.tasklar[0].tur, "Call");
assert.equal(r.body.tasklar[1].portalYazan, "Mehmet Müdür");
assert.equal(r.body.tasklar[1].gecikmis, false);
assert.equal(r.body.tasklar[2].durum, "tamam");
await iste("ali@x.com", { islem: "tasklar", leadId: 2 });
assert.equal(taskSayfaIstegi, 1, "task listesi önbellekten");

// 2. Task ekle: doğrulama, yetki, danışmana atanır, etiket
const ekle = (email, govde) => iste(email, { islem: "taskEkle", ...govde });
assert.equal((await ekle(null, { leadId: 1, ad: "Ara", tarih: gun(1) })).code, 401);
assert.equal((await ekle("nur@x.com", { leadId: 1, ad: "Ara", tarih: gun(1) })).code, 403);
assert.equal((await ekle("ali@x.com", { leadId: 1, ad: "A", tarih: gun(1) })).code, 400, "kısa ad");
assert.equal((await ekle("ali@x.com", { leadId: 1, ad: "Ara", tarih: "yok" })).code, 400, "geçersiz tarih");
assert.equal((await ekle("ali@x.com", { leadId: 1, ad: "Ara", tarih: gun(-5) })).code, 400, "geçmiş tarih");
assert.equal((await ekle("ali@x.com", { leadId: 1, ad: "Ara", tarih: gun(1), tur: 5 })).code, 400, "geçersiz tür");
assert.equal(yazilan.length, 0);
r = await ekle("mehmet@x.com", { leadId: 1, ad: "Tekrar ara", tarih: gun(2), tur: 2614522 });
assert.equal(r.code, 200);
const p = yazilan[0].g;
assert.equal(p.assignedTo, 101, "datanın danışmanına atanır");
assert.equal(p.status, 2614526);
assert.equal(p.type, 2614522);
assert.equal(p.description, "[Mehmet Müdür · Portal]");
assert.deepEqual(p.relation, [{ targetEntityId: 1, targetEntityType: "LEAD" }]);
assert.equal(r.body.task.portalYazan, "Mehmet Müdür");
await iste("ali@x.com", { islem: "tasklar", leadId: 1 });
assert.equal(taskSayfaIstegi, 2, "ekleme önbelleği temizler");

// 3. Tamamla: başka şubeye yetki yok; PUT tüm alanları ve COMPLETED ile gider
assert.equal((await iste("nil@x.com", { islem: "taskTamamla", taskId: 21 })).code, 403);
assert.equal((await iste("ali@x.com", { islem: "taskTamamla", taskId: 404 })).code, 404);
r = await iste("nil@x.com", { islem: "taskTamamla", taskId: 11 });
assert.equal(r.code, 200);
const put = yazilan.find(y => y.tip === "PUT");
assert.equal(put.id, 11);
assert.equal(put.g.status, 2614528);
assert.equal(put.g.name, "Ara");
assert.deepEqual(put.g.relation, TASKLAR[0].relation);
assert.equal(r.body.task.durum, "tamam");
r = await iste("nil@x.com", { islem: "taskTamamla", taskId: 13 });
assert.equal(r.body.zaten, true, "zaten tamamlanmış task'a yazılmaz");
assert.equal(yazilan.filter(y => y.tip === "PUT").length, 1);

process.stdout.write("Task testleri geçti.\n");
