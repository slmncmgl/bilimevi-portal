// Kullanıcı token'ıyla yazma (api/crm-rapor.js notEkle) testi: bağlantı varsa not danışmanın Bearer token'ıyla
// (etiketsiz, onun adına) gider; bağlantı yoksa eski "[Ad · Portal]" etiketli yola düşer. Ağa çıkmaz, fetch sahte.
import assert from "node:assert/strict";
import crypto from "node:crypto";

process.env.SESSION_SECRET = "test-secret";
process.env.N8N_PORTAL_TOKEN = "portal-token";
process.env.KYLAS_SIFRE_ANAHTARI = crypto.randomBytes(32).toString("base64");
process.env.KYLAS_ISTEK_HIZI = "1000";
const { sifrele } = await import("../api/_kylasKullanici.js");
const CT = sifrele("gizliSifre");

const PERSONEL = `"Ad Soyad","Şirket","Şube","E-posta","title"
"Ali Admin","Bilimevi","Merkez","ali@x.com","admin"`;
let baglantiVar = true;
const yazilan = [];
globalThis.fetch = async (url, opts = {}) => {
  url = String(url);
  const h = opts.headers || {};
  const yanit = (status, body) => ({ ok: status < 400, status, headers: { get: () => null }, json: async () => body, text: async () => (typeof body === "string" ? body : JSON.stringify(body)) });
  if (url.includes("sheet=Personel")) return yanit(200, PERSONEL);
  if (url.includes("sheet=ID")) return yanit(200, `"Email","ID"`);
  if (url.includes("/kylas-baglanti-getir")) {
    assert.equal(h["X-Portal-Token"], "portal-token", "n8n token header");
    return yanit(200, { baglanti: baglantiVar ? { email: "ali@x.com", kylasId: "999", sifreli: CT } : null });
  }
  if (url.includes("/users/login")) {
    const b = JSON.parse(opts.body);
    assert.equal(b.password, "gizliSifre", "çözülen şifre giriş için kullanılır");
    return yanit(200, { accessToken: "TKN999" });
  }
  if (url.includes("/search/lead")) {
    return yanit(200, { content: [{ id: 10, ownerId: 999 }] });
  }
  if (url.includes("/notes/relation") && opts.method === "POST") {
    yazilan.push({ auth: h.Authorization || null, apiKey: h["api-key"] || null, desc: JSON.parse(opts.body).sourceEntity.description });
    if (h.Authorization === "Bearer TKN999") return yanit(201, { id: 555, createdBy: 999, createdAt: "2026-11-20T10:00:00Z" });
    return yanit(201, { id: 556, createdBy: 71430, createdAt: "2026-11-20T10:00:00Z" }); // api-key (fallback)
  }
  throw new Error("beklenmeyen istek " + url);
};
console.warn = () => {}; console.log = () => {};
const { tokenUret } = await import("../api/_oturum.js");
const crm = (await import("../api/crm-rapor.js")).default;
async function not(email, leadId, metin) {
  const r = { code: 200 }; r.status = c => { r.code = c; return r; }; r.json = b => { r.body = b; return r; };
  await crm({ method: "POST", body: { islem: "notEkle", leadId, metin }, headers: { authorization: `Bearer ${tokenUret({ email, name: "Ali Admin" })}` } }, r);
  return r;
}

// 1. Bağlantı var: not danışmanın Bearer token'ıyla, ETİKETSİZ, createdBy = danışman
let r = await not("ali@x.com", 10, "aradım, olumlu");
assert.equal(r.code, 200);
assert.equal(r.body.id, 555, "Bearer yazımı");
assert.equal(yazilan.at(-1).auth, "Bearer TKN999", "kullanıcı token'ı kullanıldı");
assert.equal(yazilan.at(-1).desc, "aradım, olumlu", "etiketsiz düz metin");
assert.ok(!/· Portal\]/.test(yazilan.at(-1).desc), "portal etiketi yok");

// 2. Bağlantı yok: eski yola düşer (api-key + [Ad · Portal] etiketi)
baglantiVar = false;
r = await not("ali@x.com", 10, "yedek yol");
assert.equal(r.code, 200);
assert.equal(yazilan.at(-1).auth, null, "Bearer değil");
assert.match(yazilan.at(-1).desc, /^\[Ali Admin · Portal\] yedek yol$/, "etiketli yedek");

process.stdout.write("Kullanıcı token yazma testleri geçti.\n");
