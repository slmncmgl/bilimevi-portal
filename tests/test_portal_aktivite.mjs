// Bugünkü portal aktivitesi (api/crm-rapor.js islem "portalAktivite") testi
// Çalıştırma: node tests/test_portal_aktivite.mjs  (ağa çıkmaz, fetch sahte)
import assert from "node:assert/strict";

const PERSONEL = `"Ad Soyad","Şirket","Şube","E-posta","title"
"Ali Admin","Bilimevi","Merkez","ali@x.com","admin"`;
const SAHIP = { 1: 7, 2: 7, 3: 8 };
let aramaKurallari = null;
globalThis.fetch = async (url, opts = {}) => {
  url = String(url);
  const yanit = (status, body) => ({ ok: status < 400, status, headers: { get: () => null }, json: async () => body, text: async () => (typeof body === "string" ? body : JSON.stringify(body)) });
  if (url.includes("sheet=Personel")) return yanit(200, PERSONEL);
  if (url.includes("sheet=ID")) return yanit(200, `"Email","ID"`);
  if (url.includes("/notes/search")) {
    aramaKurallari = JSON.parse(opts.body).jsonRule.rules;
    const not = (lead, d) => ({ relations: [{ entityType: "LEAD", entityId: lead }], description: d });
    return yanit(200, { totalPages: 1, content: [
      not(1, "[Nil Özer · Portal] aradım"), not(1, "[Nil Özer · Portal] tekrar"), // aynı data iki not
      not(2, "<p>[Mehmet Müdür · Portal] baktım</p>"),                                // müdür yazmış, data Nil'in
      not(3, "[Nur Alpay · Portal] başka danışman"),                                  // başka danışmanın datası
      not(2, "etiketsiz otomasyon notu"),                                             // portal değil
    ] });
  }
  if (url.includes("/search/lead")) {
    const idler = JSON.parse(opts.body).jsonRule.rules.find(k => k.field === "id").value;
    return yanit(200, { content: idler.map(id => ({ id, ownerId: SAHIP[id] })) });
  }
  throw new Error("beklenmeyen istek " + url);
};
console.warn = () => {};
process.env.SESSION_SECRET = "test-secret";
process.env.KYLAS_ISTEK_HIZI = "1000";
const { tokenUret } = await import("../api/_oturum.js");
const crm = (await import("../api/crm-rapor.js")).default;
async function iste(body) { const r = { code: 200 }; r.status = c => { r.code = c; return r; }; r.json = b => { r.body = b; return r; }; await crm({ method: "POST", body, headers: { authorization: `Bearer ${tokenUret({ email: "ali@x.com", name: "Ali" })}` } }, r); return r; }

let r = await iste({ islem: "portalAktivite", ownerIds: [7] });
assert.equal(r.code, 200);
assert.deepEqual({ veri: r.body.veri, not: r.body.not }, { veri: 2, not: 3 }, "Nil'in 2 datası, 3 portal notu");
assert.ok(aramaKurallari.some(k => k.field === "createdBy" && k.value === 71430), "Selman adına kayıtlı notlar aranır");
const bas = new Date(aramaKurallari.find(k => k.field === "createdAt").value);
assert.equal((bas.getUTCHours() + 3) % 24, 0, "başlangıç Türkiye saatiyle gece yarısı");
r = await iste({ islem: "portalAktivite", ownerIds: [7, 8] });
assert.equal(r.body.veri, 3);
assert.equal((await iste({ islem: "portalAktivite", ownerIds: [] })).code, 400);
process.stdout.write("Portal aktivite testleri geçti.\n");
