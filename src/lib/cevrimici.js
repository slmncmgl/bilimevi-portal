// v2.0: n8n yoklaması yerine gerçek zamanlı WebSocket (Coolify "bilimevi-cevrimici", kodu servis/cevrimici/).
//   Bağlantı sekme gizlenince de açık kalır; koparsa artan beklemeyle (1 sn → 30 sn) yeniden bağlanır.
//   Kimlik: portal oturum token'ı ilk mesajda gönderilir (URL'de değil). Token yoksa servis izleme modunda ad/mail ile kabul eder.
//   Dürtmeler her sayfada anında gelir; durtmeDinle() artık bir şey yapmaz, sadece uyumluluk için duruyor.
//   Dışa açılan fonksiyonlar ve olay adları ("bilimevi-cevrimici", "bilimevi-durtme") v1.3 ile aynı.
// v1.3: nabız 1 dk; dürtme (👋) n8n üzerinden. v1.1: nabız doğrudan Coolify'daki n8n'e (xh9SPxvWq3XwFJ7D).
import { getSession } from "../utils/sheets";
import { tokenAl } from "./oturum";

const WS_URL = "wss://ws.bilimevi.cloud";

let sonDurum = null;
let ws = null;
let bekleme = 1000;
let yenidenZaman = null;
let bagliKullanici = null;
let refSayac = 0;
const bekleyenDurt = new Map(); // ref -> resolve

export function cevrimiciDurum() {
  return sonDurum;
}

export function durtmeDinle() {}

function yay(ad, detail) {
  window.dispatchEvent(new CustomEvent(ad, { detail }));
}

function kapat() {
  clearTimeout(yenidenZaman);
  yenidenZaman = null;
  bagliKullanici = null;
  if (ws) {
    ws.onclose = null;
    try { ws.close(); } catch (_) {}
    ws = null;
  }
  for (const r of bekleyenDurt.values()) r(false);
  bekleyenDurt.clear();
}

function yenidenPlanla() {
  if (yenidenZaman) return;
  const sure = bekleme + Math.random() * 1000;
  bekleme = Math.min(bekleme * 2, 30000);
  yenidenZaman = setTimeout(() => { yenidenZaman = null; baglan(); }, sure);
}

function baglan() {
  const user = getSession();
  if (!user) return;
  if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;
  const kimlik = user.email || user.name || "";
  bagliKullanici = kimlik;
  let s;
  try { s = new WebSocket(WS_URL); } catch (_) { return yenidenPlanla(); }
  ws = s;
  s.onopen = () => {
    bekleme = 1000;
    s.send(JSON.stringify({ t: "giris", token: tokenAl(), kullanici: kimlik, ad: user.name || "" }));
  };
  s.onmessage = e => {
    let m; try { m = JSON.parse(e.data); } catch (_) { return; }
    if (m.t === "durum") {
      sonDurum = { sayi: m.sayi, liste: Array.isArray(m.liste) ? m.liste : [], ben: m.ben || null };
      yay("bilimevi-cevrimici", sonDurum);
    } else if (m.t === "durtme" && Array.isArray(m.kimden) && m.kimden.length) {
      yay("bilimevi-durtme", m.kimden);
    } else if (m.t === "durtuldu") {
      const r = bekleyenDurt.get(m.ref);
      if (r) { bekleyenDurt.delete(m.ref); r(!!m.ok); }
    }
  };
  s.onclose = () => {
    if (ws === s) ws = null;
    for (const r of bekleyenDurt.values()) r(false);
    bekleyenDurt.clear();
    if (getSession()) yenidenPlanla();
  };
  s.onerror = () => {};
}

// Eskiden nabız gönderirdi; artık bağlantının açık olduğundan emin olur ve son durumu döner.
export async function nabizGonder() {
  if (!getSession()) return null;
  baglan();
  return sonDurum;
}

export function durt(id) {
  if (!ws || ws.readyState !== 1) return Promise.resolve(false);
  const ref = ++refSayac;
  return new Promise(resolve => {
    bekleyenDurt.set(ref, resolve);
    ws.send(JSON.stringify({ t: "durt", id, ref }));
    setTimeout(() => { if (bekleyenDurt.delete(ref)) resolve(false); }, 5000);
  });
}

export function nabizBaslat() {
  if (typeof window === "undefined" || window.__bilimeviNabiz) return;
  window.__bilimeviNabiz = true;
  baglan();
  // Giriş/çıkış ve kullanıcı değişimini yakala (oturum sessionStorage'da, olay yok)
  setInterval(() => {
    const user = getSession();
    const kimlik = user ? user.email || user.name || "" : null;
    if (!kimlik) { if (ws || bagliKullanici) { kapat(); sonDurum = null; } return; }
    if (bagliKullanici && kimlik !== bagliKullanici) kapat();
    if (!ws && !yenidenZaman) baglan();
  }, 5000);
  // Ağ geri gelince ya da sekme öne gelince beklemeden dene
  const hemen = () => { if (!ws && getSession()) { clearTimeout(yenidenZaman); yenidenZaman = null; bekleme = 1000; baglan(); } };
  window.addEventListener("online", hemen);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) hemen(); });
}
