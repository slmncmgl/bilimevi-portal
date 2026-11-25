// v1.1: dürtme mesajı gönderenin id'sini de taşır (kimdenId) → alan kişi "Sen de el salla" ile karşılık verebilir.
// bilimevi-cevrimici v1.0: portal çevrimiçi listesi + el sallama (👋) WebSocket servisi (Coolify, wss://ws.bilimevi.cloud)
// Kimlik: portal oturum token'ı (bilimevi-portal api/_oturum.js ile aynı biçim, aynı SESSION_SECRET). İlk mesaj {t:"giris", token}.
// AUTH_ENFORCE=1 değilse token'sız/geçersiz girişler loglanır, istemcinin bildirdiği kimlikle kabul edilir (izleme modu).
import http from "node:http";
import crypto from "node:crypto";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT || 3000);
const IZINLI = (process.env.ALLOWED_ORIGINS || "https://portal.bilimevi.com,https://bilimevi-portal.vercel.app,http://localhost:5173")
  .split(",").map(s => s.trim()).filter(Boolean);
const ENFORCE = process.env.AUTH_ENFORCE === "1";
const SECRET = process.env.SESSION_SECRET || "";

const kisiler = new Map(); // id -> { ad, sekmeler:Set<ws> }

function b64url(buf) { return Buffer.from(buf).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_"); }
function tokenCoz(token) {
  if (!SECRET) return { hata: "secret_yok" };
  if (!token) return { hata: "token_yok" };
  const [veri, imza] = String(token).split(".");
  if (!veri || !imza) return { hata: "token_gecersiz" };
  const beklenen = b64url(crypto.createHmac("sha256", SECRET).update(veri).digest());
  if (imza.length !== beklenen.length || !crypto.timingSafeEqual(Buffer.from(imza), Buffer.from(beklenen))) return { hata: "token_gecersiz" };
  try {
    const k = JSON.parse(Buffer.from(veri.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    if (!k.email || !k.exp || k.exp < Date.now()) return { hata: "token_suresi_doldu" };
    return { id: String(k.email).toLowerCase(), ad: k.name || k.email };
  } catch (_) { return { hata: "token_gecersiz" }; }
}

function gonder(ws, msg) { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); }
function liste() { return [...kisiler].map(([id, k]) => ({ id, ad: k.ad })).sort((a, b) => a.ad.localeCompare(b.ad, "tr")); }
function yayinla() {
  const l = liste();
  for (const [id, k] of kisiler) for (const ws of k.sekmeler) gonder(ws, { t: "durum", sayi: l.length, liste: l, ben: id });
}
function cikar(ws) {
  const k = ws.kimlik && kisiler.get(ws.kimlik);
  if (!k) return;
  k.sekmeler.delete(ws);
  if (!k.sekmeler.size) { kisiler.delete(ws.kimlik); yayinla(); }
}

const sunucu = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, kisi: kisiler.size, enforce: ENFORCE, secret: !!SECRET }));
  }
  res.writeHead(404); res.end();
});

const wss = new WebSocketServer({
  server: sunucu, maxPayload: 4096,
  verifyClient: ({ origin }) => IZINLI.includes(origin),
});

wss.on("connection", ws => {
  ws.canli = true;
  ws.durtmeler = [];
  ws.on("pong", () => { ws.canli = true; });
  const girisSuresi = setTimeout(() => { if (!ws.kimlik) ws.close(4001, "giris_yok"); }, 10000);

  ws.on("message", raw => {
    let m; try { m = JSON.parse(raw); } catch (_) { return; }
    if (m.t === "giris" && !ws.kimlik) {
      const c = tokenCoz(m.token);
      let id = c.id, ad = c.ad;
      if (c.hata) {
        if (ENFORCE) return ws.close(4003, c.hata);
        console.log("izleme: token", c.hata);
        id = String(m.kullanici || "").toLowerCase().slice(0, 120);
        ad = String(m.ad || id).slice(0, 80);
        if (!id) return ws.close(4003, "kimlik_yok");
      }
      clearTimeout(girisSuresi);
      ws.kimlik = id;
      const yeni = !kisiler.has(id);
      if (yeni) kisiler.set(id, { ad, sekmeler: new Set() });
      kisiler.get(id).sekmeler.add(ws);
      if (yeni) yayinla();
      else { const l = liste(); gonder(ws, { t: "durum", sayi: l.length, liste: l, ben: id }); }
      return;
    }
    if (!ws.kimlik) return;
    if (m.t === "durt") {
      const simdi = Date.now();
      ws.durtmeler = ws.durtmeler.filter(t => simdi - t < 60000);
      const hedefId = String(m.id || "").toLowerCase();
      const hedef = kisiler.get(hedefId);
      let ok = false;
      if (hedef && hedefId !== ws.kimlik && ws.durtmeler.length < 10) {
        ws.durtmeler.push(simdi);
        const ad = kisiler.get(ws.kimlik)?.ad || ws.kimlik;
        for (const s of hedef.sekmeler) gonder(s, { t: "durtme", kimden: [ad], kimdenId: [ws.kimlik] });
        ok = true;
      }
      gonder(ws, { t: "durtuldu", ref: m.ref, ok });
    }
  });
  ws.on("close", () => { clearTimeout(girisSuresi); cikar(ws); });
  ws.on("error", () => {});
});

setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.canli) { ws.terminate(); continue; }
    ws.canli = false; ws.ping();
  }
}, 30000);

sunucu.listen(PORT, () => console.log(`bilimevi-cevrimici :${PORT} enforce=${ENFORCE} secret=${!!SECRET}`));
