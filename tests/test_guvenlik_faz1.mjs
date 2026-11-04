// Güvenlik Faz 1 testleri: api/_oturum.js, api/kylas.js, api/login.js, api/auth.js
// Çalıştırma: node tests/test_guvenlik_faz1.mjs  (ağa çıkmaz, fetch sahte)
import assert from "node:assert/strict";

const cagrilar = [];
let sahteCevap = { status: 200, json: { ok: true } };
globalThis.fetch = async (url, opts = {}) => {
  cagrilar.push({ url: String(url), opts });
  const c = typeof sahteCevap === "function" ? sahteCevap(url, opts) : sahteCevap;
  return { ok: c.status < 400, status: c.status, json: async () => c.json, text: async () => JSON.stringify(c.json) };
};
const res = () => { const r = { code: 200, body: null }; r.status = c => { r.code = c; return r; }; r.json = b => { r.body = b; return r; }; return r; };
const req = (body, headers = {}) => ({ method: "POST", body, headers });
console.warn = () => {};

const { tokenUret, tokenCoz } = await import("../api/_oturum.js");
const kylas = (await import("../api/kylas.js")).default;
const login = (await import("../api/login.js")).default;
const auth = (await import("../api/auth.js")).default;

// 1. SESSION_SECRET yok: token üretilmez, istekler geçer (bugünkü davranış)
delete process.env.SESSION_SECRET; delete process.env.AUTH_ENFORCE;
assert.equal(tokenUret({ email: "a@b.com" }), null);
let r = res(); await kylas(req({ path: "leads", method: "POST", body: {} }), r);
assert.equal(r.code, 200, "secret yokken lead oluşturma geçmeli");

// 2. İzin listesi: silme, okuma, güncelleme reddedilir (secret olsa da olmasa da)
for (const [m, p] of [["DELETE", "leads/1"], ["GET", "users/me"], [undefined, "users/me"], ["PATCH", "leads/1"], ["POST", "search/lead"], ["POST", "leads/1/convert"], ["POST", "leads/../users"]]) {
  cagrilar.length = 0; r = res(); await kylas(req({ path: p, method: m }), r);
  assert.equal(r.code, 403, `${m} ${p} reddedilmeli`);
  assert.equal(cagrilar.length, 0, "Kylas'a istek gitmemeli");
}
r = res(); await kylas(req({ path: "notes/relation", method: "post", body: {} }), r);
assert.equal(r.code, 200, "not ekleme geçmeli");

// 3. Token üret / çöz
process.env.SESSION_SECRET = "test-secret-123";
const t = tokenUret({ email: "Ali@Bilimevi.com", name: "Ali" });
assert.equal(tokenCoz({ headers: { authorization: `Bearer ${t}` } }).kullanici.email, "ali@bilimevi.com");
assert.equal(tokenCoz({ headers: {} }).hata, "token_yok");
assert.equal(tokenCoz({ headers: { authorization: `Bearer ${t}x` } }).hata, "token_gecersiz");
const [v] = t.split(".");
assert.equal(tokenCoz({ headers: { authorization: `Bearer ${v}.AAAA` } }).hata, "token_gecersiz");
process.env.SESSION_SECRET = "baska"; assert.equal(tokenCoz({ headers: { authorization: `Bearer ${t}` } }).hata, "token_gecersiz");
process.env.SESSION_SECRET = "test-secret-123";

// 4. İzleme modu: token'sız istek geçer
r = res(); await kylas(req({ path: "leads", method: "POST", body: {} }), r);
assert.equal(r.code, 200, "izleme modunda token'sız geçmeli");

// 5. Zorunlu mod: token'sız 401, geçerli token 200
process.env.AUTH_ENFORCE = "1";
cagrilar.length = 0; r = res(); await kylas(req({ path: "leads", method: "POST", body: {} }), r);
assert.equal(r.code, 401); assert.equal(cagrilar.length, 0);
r = res(); await kylas(req({ path: "leads", method: "POST", body: {} }, { authorization: `Bearer ${t}` }), r);
assert.equal(r.code, 200);
delete process.env.AUTH_ENFORCE;

// 6. api/login: doğru şifre token verir, yanlış şifre 401
sahteCevap = { status: 200, json: { success: true, personel: { "E-posta": "ali@bilimevi.com", "Ad Soyad": "Ali" } } };
r = res(); await login(req({ username: "ali", password: "x" }), r);
assert.equal(r.code, 200); assert.ok(tokenCoz({ headers: { authorization: `Bearer ${r.body.token}` } }).kullanici);
assert.match(cagrilar.at(-1).url, /script\.google\.com/);
assert.deepEqual(JSON.parse(cagrilar.at(-1).opts.body), { action: "loginWithKullaniciAdi", username: "ali", password: "x" });
sahteCevap = { status: 200, json: { success: false, msg: "Hatalı" } };
r = res(); await login(req({ username: "ali", password: "y" }), r);
assert.equal(r.code, 401); assert.equal(r.body.token, undefined);
delete process.env.SESSION_SECRET;
r = res(); await login(req({ username: "ali", password: "x" }), r);
assert.equal(r.code, 503);
process.env.SESSION_SECRET = "test-secret-123";

// 7. api/auth: Google cevabına token eklenir, eski alanlar aynı
sahteCevap = (url) => String(url).includes("oauth2.googleapis.com/token")
  ? { status: 200, json: { access_token: "x" } }
  : { status: 200, json: { email: "ali@bilimevi.com", name: "Ali", verified_email: true } };
r = res(); await auth(req({ code: "c" }), r);
assert.equal(r.body.email, "ali@bilimevi.com"); assert.equal(r.body.name, "Ali"); assert.ok(r.body.token);

console.log("Güvenlik Faz 1: tüm testler geçti");
