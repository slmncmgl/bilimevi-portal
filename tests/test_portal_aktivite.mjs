// Bugünkü portal aktivitesi (api/crm-rapor.js islem "portalAktivite") testi
// Çalıştırma: node tests/test_portal_aktivite.mjs  (ağa çıkmaz, fetch sahte)
// Artık iki kaynak sayılır: Selman adına "[Ad · Portal]" etiketli notlar (bağlantısız danışmanlar) +
// danışmanın KENDİ id'siyle açtığı notlar (bağlı danışmanlar, kullanıcı token'ı).
import assert from "node:assert/strict";

const PERSONEL = `"Ad Soyad","Şirket","Şube","E-posta","title"
"Ali Admin","Bilimevi","Merkez","ali@x.com","admin"`;
const SAHIP = { 1: 7, 2: 7, 3: 8, 5: 7 };
const aranan = [];
globalThis.fetch = async (url, opts = {}) => {
  url = String(url);
  const yanit = (status, body) => ({ ok: status < 400, status, headers: { get: () => null }, json: async () => body, text: async () => (typeof body === "string" ? body : JSON.stringify(body)) });
  if (url.includes("sheet=Personel")) return yanit(200, PERSONEL);
  if (url.includes("sheet=ID")) return yanit(200, `"Email","ID"`);
  if (url.includes("/notes/search")) {
    const rules = JSON.parse(opts.body).jsonRule.rules;
    const cb = rules.find(k => k.field === "createdBy").value;
    aranan.push(cb);
    const not = (lead, d) => ({ relations: [{ entityType: "LEAD", entityId: lead }], description: d });
    let content = [];
    if (cb === 71430) content = [ // Selman adına, etiketli
      not(1, "[Nil Özer · Portal] aradım"), not(1, "[Nil Özer · Portal] tekrar"),
      not(2, "<p>[Mehmet Müdür · Portal] baktım</p>"), not(3, "[Nur Alpay · Portal] başka"),
      not(2, "etiketsiz otomasyon notu"),
    ];
    else if (cb === 7) content = [not(5, "kendi notum"), not(1, "bir not daha")]; // danışman kendi token'ıyla
    else if (cb === 8) content = [not(3, "8in notu")];
    return yanit(200, { totalPages: 1, content });
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

// Nil (7): etiketli {1,1,2} (3 not) + kendi {5,1} (2 not) => distinct data {1,2,5}=3, toplam 5
let r = await iste({ islem: "portalAktivite", ownerIds: [7] });
assert.equal(r.code, 200);
assert.deepEqual({ veri: r.body.veri, not: r.body.not }, { veri: 3, not: 5 }, "etiketli + kendi notlar birlikte");
assert.ok(aranan.includes(71430), "Selman (etiketli) aranır");
assert.ok(aranan.includes(7), "danışmanın kendi id'si de aranır");

// 7 + 8: etiketli {1,1,2,3}=4 + kendi(7){5,1}=2 + kendi(8){3}=1 => distinct {1,2,3,5}=4
r = await iste({ islem: "portalAktivite", ownerIds: [7, 8] });
assert.equal(r.body.veri, 4);

assert.equal((await iste({ islem: "portalAktivite", ownerIds: [] })).code, 400);
process.stdout.write("Portal aktivite testleri geçti.\n");
