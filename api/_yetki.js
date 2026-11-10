// v1.0: CRM verisinde sunucu tarafı rol kontrolü (kim hangi danışmanın lead'lerini görebilir)
// "_" ile başladığı için Vercel bu dosyayı ayrı bir adres olarak yayınlamaz.
//
// Kimlik token'dan (api/_oturum.js) gelir: e-posta. Rol, şube ve Kylas ID İzin Yönetimi sheet'inden okunur:
//   Personel sekmesi: E-posta, Ad Soyad, Şube, title (admin/director/owner/manager/staff)
//   ID sekmesi: Email -> Kylas ID
// Kural (ekrandakiyle aynı): admin/director/owner herkesi, manager kendi şubesindekileri, staff sadece kendini görür.
// Sheet 10 dk önbellekte tutulur; rol değişikliği en geç 10 dk sonra geçerli olur.
//
// Mod: CRM_YETKI_ENFORCE=1 ya da AUTH_ENFORCE=1 değilse sadece loglanır ("[yetki]" öneki), istek geçer.
import { tokenCoz } from "./_oturum.js";

const SHEET_ID = "1jS9yt_wIrL-JXbstqtrG9nML0nalRmOkSarpIbOLCxA";
const ONBELLEK_MS = 10 * 60 * 1000;
const YONETICI_ROLLERI = ["admin", "director", "owner"];
let dizinOnbellek = null; // { zaman, dizin }

export const kucuk = v => String(v || "").trim().toLocaleLowerCase("tr-TR");

export function zorunluMu() {
  return process.env.CRM_YETKI_ENFORCE === "1" || process.env.AUTH_ENFORCE === "1";
}

// Tırnaklı alanları ve satır içi virgülleri doğru okuyan küçük CSV ayrıştırıcı
export function csvOku(metin) {
  const satirlar = [];
  let satir = [], alan = "", tirnak = false;
  for (let i = 0; i < metin.length; i++) {
    const ch = metin[i];
    if (tirnak) {
      if (ch === '"' && metin[i + 1] === '"') { alan += '"'; i++; }
      else if (ch === '"') tirnak = false;
      else alan += ch;
    } else if (ch === '"') tirnak = true;
    else if (ch === ",") { satir.push(alan); alan = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && metin[i + 1] === "\n") i++;
      satir.push(alan); satirlar.push(satir); satir = []; alan = "";
    } else alan += ch;
  }
  if (alan || satir.length) { satir.push(alan); satirlar.push(satir); }
  const baslik = (satirlar.shift() || []).map(h => h.trim());
  return satirlar.filter(s => s.some(x => x.trim())).map(s => Object.fromEntries(baslik.map((h, i) => [h, (s[i] || "").trim()])));
}

async function sekmeOku(sekme) {
  const r = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sekme)}`);
  if (!r.ok) throw new Error(`${sekme} sekmesi okunamadı (HTTP ${r.status})`);
  return csvOku(await r.text());
}

// Dönüş: { kisiler: Map(email -> { ad, sube, rol, kylasId }), subeIdleri: Map(sube -> Set(kylasId)) }
export async function dizinGetir() {
  if (dizinOnbellek && Date.now() - dizinOnbellek.zaman < ONBELLEK_MS) return dizinOnbellek.dizin;
  const [personel, idler] = await Promise.all([sekmeOku("Personel"), sekmeOku("ID")]);
  const idHarita = new Map();
  idler.forEach(r => {
    const id = Number(r.ID);
    if (r.Email && Number.isInteger(id) && id > 0) idHarita.set(kucuk(r.Email), id);
  });
  const kisiler = new Map();
  const subeIdleri = new Map();
  personel.forEach(p => {
    const email = kucuk(p["E-posta"]);
    if (!email) return;
    const kisi = { ad: p["Ad Soyad"] || "", sube: kucuk(p["Şube"]), rol: kucuk(p.title || p.Title) || "staff", kylasId: idHarita.get(email) || null };
    kisiler.set(email, kisi);
    if (kisi.sube && kisi.kylasId) {
      if (!subeIdleri.has(kisi.sube)) subeIdleri.set(kisi.sube, new Set());
      subeIdleri.get(kisi.sube).add(kisi.kylasId);
    }
  });
  const dizin = { kisiler, subeIdleri };
  dizinOnbellek = { zaman: Date.now(), dizin };
  return dizin;
}

// Dönüş: { tur: "admin" | "manager" | "staff" | "anonim" | "tanimsiz" | "hata", ad, idler: Set }
//   anonim: token yok/geçersiz. tanimsiz: token var ama Personel'de yok. hata: sheet okunamadı.
export async function yetkiBul(req) {
  const { kullanici } = tokenCoz(req);
  if (!kullanici?.email) return { tur: "anonim", ad: "", idler: new Set() };
  let dizin;
  try { dizin = await dizinGetir(); } catch { return { tur: "hata", ad: kullanici.name || "", idler: new Set() }; }
  const kisi = dizin.kisiler.get(kucuk(kullanici.email));
  if (!kisi) return { tur: "tanimsiz", ad: kullanici.name || "", idler: new Set() };
  if (YONETICI_ROLLERI.includes(kisi.rol)) return { tur: "admin", ad: kisi.ad, idler: new Set() };
  if (kisi.rol === "manager") {
    const idler = new Set(dizin.subeIdleri.get(kisi.sube) || []);
    if (kisi.kylasId) idler.add(kisi.kylasId);
    return { tur: "manager", ad: kisi.ad, idler };
  }
  return { tur: "staff", ad: kisi.ad, idler: new Set(kisi.kylasId ? [kisi.kylasId] : []) };
}

export function gorebilirMi(yetki, ownerIds) {
  if (yetki.tur === "admin") return true;
  if (!["manager", "staff"].includes(yetki.tur)) return false;
  return ownerIds.length > 0 && ownerIds.every(id => yetki.idler.has(Number(id)));
}

// İstenen danışmanlar görülebiliyorsa true. Değilse loglar; zorunlu modda 403 (ya da 503) gönderip false döner.
export function yetkiKontrol(yetki, ownerIds, res, kaynak) {
  if (gorebilirMi(yetki, ownerIds)) return true;
  const zorunlu = zorunluMu();
  console.warn(`[yetki] ${kaynak}: ${yetki.tur}${yetki.ad ? ` (${yetki.ad})` : ""} -> ${ownerIds.join(",") || "-"} (${zorunlu ? "reddedildi" : "izleme, geçti"})`);
  if (!zorunlu) return true;
  if (yetki.tur === "hata") res.status(503).json({ error: "Yetki bilgisi okunamadı, biraz sonra tekrar deneyin." });
  else if (yetki.tur === "anonim") res.status(401).json({ error: "Oturum doğrulanamadı. Lütfen çıkış yapıp tekrar giriş yapın." });
  else res.status(403).json({ error: "Bu danışmanın verisini görme yetkiniz yok." });
  return false;
}
