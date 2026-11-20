// v3.8: not/task bağlı danışmanın KENDİ token'ıyla gider (Kylas'ta onun adına, etiketsiz). Bağlantı yoksa ya da yazma
//       başarısızsa eski yönteme düşer (Selman anahtarı + "[Ad · Portal]" etiketi). Giriş yapan e-posta token'dan okunur.
//       portalAktivite artık danışmanın kendi adına açtığı notları da sayar (etiketli + kendi id'li).
// v3.7: islem "portalAktivite": { ownerIds } -> bugün (TR saatiyle 00:00'dan beri) portaldan not girilen, bu danışmanlara ait
//       Data sayısı ({ veri, not }). Portal notları Selman adına kayıtlı ve "[Ad · Portal]" etiketli olanlardır. 60 sn önbellek,
//       not eklenince silinir. Takip Tablosu liste başlığında "/ N aktivite".
// v3.6: takip yanıtında takipsiz ve gecikmis listeleri yerine tek "acik" listesi: her açık data { ..., zorunlu, taskTur
//       ("ileri" | "gecikmis" | "yok"), takipsiz }. Takip Tablosu kartlarının hepsi bu listeyi süzerek altta gösterir.
// v3.5: Kylas hız sınırı: kova 10 birim, saniyede 5 birim dolar, her istek 2 birim yer (20.11.2026 ölçüldü) => saniyede ~2,5
//       istek, 5 anlık. Kylas'a giden bütün istekler kylasIstek'ten geçer. Ortak kova saniyede 2,2 istek bırakır (4 anlık), sıra korunur. 429 gelirse kova boşaltılır, istek bekleyip 6 kereye kadar
//       tekrar denenir. Hepsi yine 429 ise kullanıcıya 503 "Kylas yoğun". notlar yanıtı 45 sn önbellekte (not ekleyince silinir).
//       Hız KYLAS_ISTEK_HIZI ile değiştirilebilir (testler yüksek verir).
// v3.4: Toplu Data Follow Up task işlemleri (hepsi zorunlu yetki: staff kendi, manager şubesinin, admin her datası):
//       tasklar { leadId } -> datanın task'ları (tüm task'lar 90 sn önbellekte, Kylas lead'e göre süzemiyor);
//       taskEkle { leadId, ad, tarih (ISO), tur? } -> datanın danışmanına atanır, açıklamada "[Yazan · Portal]";
//       taskTamamla { taskId } -> task okunur, durum COMPLETED ile geri yazılır (PUT). "[task]" logu.
//       ozet: portaldan açılan task'lar (Selman adına, etiketinde danışmanın adı) da danışmanın açtığı task sayılır.
// v3.3: islem "detay": { leadId } -> Ele al ekranı için iletişim bilgileri (telefon, e-posta, şehir, form tarihi, kampanya, kaynak).
//       Kişisel veri olduğu için izleme modu yok: geçerli oturum; staff kendi, manager şubesinin, admin her datayı görür. "[detay]" logu.
// v3.2: islem "notEkle": { leadId, metin } -> Kylas'ta dataya not (Takip Tablosu > "Bu dataları ele al").
//       Not portalın API anahtarıyla (Selman) yazılır, başına "[Yazan Ad · Portal]" eklenir. Yazma her zaman zorunlu yetki:
//       geçerli oturum; staff kendi, manager şubesinin datasına, admin her dataya. "[not]" önekiyle loglanır (metin loglanmaz).
//       notlar { boyut?: 1-20 } (varsayılan 3). notlar/sonNotlar portal etiketli notta yazan = etiketteki ad.
//       ozet: danışmanın portaldan girdiği notlar (Selman adına kayıtlı, etiketinde danışmanın adı) da sayılır.
// v3.1: takip { kampanya?: metin } -> Campaign Name (utmCampaign) bu metni içeren datalar (Kylas "contains", harf duyarsız); satırlarda kampanya
// v3.0: ozet { ownerId, gun: null|1-3650, kaynaklar? }: gun null = tüm zamanlar. kaynaklar verilirse yeni datalar ve aktivite
//       (not, task) sadece o kaynaklardaki datalar için sayılır (not/task'ın datasının kaynağı tek aramayla okunur).
// v2.9: degerlendirme (Performans Tablosu) sadece admin: değilse "[yetki]" logu, zorunlu modda 403
// v2.8: islem "ata": { leadIds (en fazla 25), yeniSahip } -> datanın sahibini (ownerId) Kylas'ta değiştirir. Data Tablosu listesinden.
//       İzleme modundan bağımsız HER ZAMAN zorunlu yetki: geçerli oturum + admin ya da manager. Hedef satış ekibinden olmalı.
//       Manager sadece kendi şubesindeki datayı kendi şubesindeki danışmana aktarır. Yazmalar sırayla, aralarında 700 ms.
//       Sonuç: { aktarilan: [id], zatenSahibi: [id], bulunamayan: [id], hatali: [{ id, hata }] }. Her aktarma "[ata]" önekiyle loglanır.
// v2.7: islem "liste" datanın kaynağını da döner (kaynak: source id), Data Tablosu listesinde Kaynak sütunu için
// v2.6: Aktivite Tablosu "Son N gün özeti" (tek danışman, N 1-90): islem "ozet": { ownerId, gun } ->
//       dönemde gelen yeni datalar (şu anki aşama, task'ı ve notu var mı, en fazla 300'ü listede), danışmanın dönemde
//       yazdığı not (POST /v1/notes/search, createdBy + createdAt), açtığı ve tamamladığı task sayısı. Aşama değişikliği henüz sayılmıyor.
// v2.5: izinli sayılması için Kylas'ta data atamasına kapalı + gelecekte bir bitiş tarihi gerekir. Bitiş tarihi olmayan
//       "müsait değil" Kylas'ın anlık durumu (18.11.2026'da 48 aktif kullanıcıda vardı), izin sayılmaz.
// v2.4: islem "sonNotlar": { leadler: [{ id, ownerId }] } (en fazla 50) -> { notlar: { id: { tarih, yazan } | null } }.
//       Aktivite Tablosu listede görünen datalar için son notun tarihini gösterir (Kylas not girince Latest Activity On'u güncellemiyor).
//       Admin değilse sahipler Kylas'tan okunur ve rol kontrolünden geçer. Not istekleri 4'erli, 429'da bekleyip tekrar dener.
// v2.3: 10.000'i aşan dönemde kayıtlar tek sorguda çekilir, sadece data sayısı danışman başına sayılır (3'erli paralel).
// v2.2: tarih seçimi "Tümü" ya da herhangi bir N gün olabilir. 180 güne kadar last_n_days, üstünde createdAt > tarih (tarihKurali).
//       Değerlendirmede gun null = tüm zamanlar; 10.000'i aşan dönemde data/kayıt sayıları danışman başına sayım sorgusuyla alınır.
//       sessizGun 0 = "Tümü": son etkinliğe bakılmaz, task'ı olmayan her açık data takipsiz sayılır.
// v2.1: Kylas 429 (hız sınırı) dönerse arama bekleyip tekrar dener.
//       islem "degerlendirme" (Performans Değerlendirme sekmesi): { ownerIds, kaynaklar?, gun: null|N, sessizGun }
//       -> danışman başına açık yük, takipsiz, task durumu, "Yeni"de 1 günden fazla bekleyen, dönemdeki data ve Yeni Kayıt,
//       Kylas müsaitlik durumu (izinli mi). Puanlama ekranda yapılır, sunucu sadece sayıları verir.
//       Takip sınıflaması takip ve degerlendirme için ortak (takipDurumu).
// v2.0: task zorunlu küme = İlgili (her kaynak) + VIP kaynaklı Görüşme. Bu kümede task yoksa son etkinliğe bakılmadan takipsiz.
//       Na1-Na3 (VIP olsa da) ve VIP olmayan Görüşme: eskisi gibi task yok + son etkinlik sessizGun'den eski.
//       taskBeklenen, ileri/gecikmiş task ve gecikmiş listesi de bu kümeden. Takipsiz satırında "zorunlu" işareti var.
// v1.9: task sadece İlgili'de beklenir (Görüşme çıkarıldı). Hata mesajlarında "lead" yerine "Data".
// v1.8: task sadece Görüşme ve İlgili'de beklenir. ileriTask, gecikmisTask, taskYok ve gecikmiş listesi bu iki aşamadan;
//       taskBeklenen = Görüşme + İlgili lead sayısı. toplam ve takipsiz tanımı değişmedi (Na1-İlgili, task yok + sessiz).
// v1.7: islem "takip" birden fazla danışman alır: { ownerIds: [..] } (eski tek "ownerId" de geçer).
//       Cevapta danışman başına özet de var: danismanlar { ownerId: { toplam, ileriTask, gecikmisTask, taskYok, takipsiz } }
// v1.6: islem "takip" isteğe bağlı { kaynaklar: [..] } alır (boşsa tüm kaynaklar)
// v1.5: birden fazla veri kaynağı: { kaynaklar: [id, ..] } (eski tek "kaynak" da kabul edilir)
// v1.4: islem "takip" gecikmiş task'lı lead'leri de döndürür (gecikmis: en eski task önce)
// v1.3: sunucu tarafı rol kontrolü (api/_yetki.js): staff sadece kendi, manager kendi şubesinin lead'lerini alabilir.
//       Şimdilik izleme modunda: kural dışı istekler "[yetki]" önekiyle loglanır, geçer. CRM_YETKI_ENFORCE=1 ile zorunlu olur.
//       Zorunlu modda özet tablo da yetkiye göre süzülür; notlarda lead'in gerçek sahibi Kylas'tan kontrol edilir.
// v1.2: islem "takip" (Takip Raporu sekmesi): bir danışmanın aşama 2-6 lead'leri, task ve sessizlik durumu
// v1.1: islem "liste" (hücreye tıklanınca lead listesi) ve "notlar" (lead'in son 3 notu) eklendi
// v1.0: Performans Analizi > CRM Raporu
// Seçilen veri kaynağındaki Bilimevi pipeline lead'lerini danışman x aşama olarak sayar.
// Kylas'tan sadece ownerId ve pipelineStage çekilir (isim, telefon, mail tarayıcıya gitmez), sadece sayılar döner.
// Girdi: { kaynak: <source id>, gun: 90 | null }  (gun boşsa tüm zamanlar)
//   islem "liste": + { ownerIds: [..], asama: <stage id> | null } -> lead listesi (en fazla LISTE_SINIR)
//   islem "takip": { ownerId, sessizGun: 14 } -> özet + takipsiz lead'ler (task yok, son aktivite sessizGun'den eski)
//   islem "notlar": { leadId, ownerId } -> son 3 not (HTML temizlenmiş düz metin)
import { oturumKontrol, tokenCoz } from "./_oturum.js";
import { anahtarVar, coz, kullaniciTokeni, tokenGecersiz } from "./_kylasKullanici.js";
import { yetkiBul, yetkiKontrol, zorunluMu, dizinGetir } from "./_yetki.js";
import { satisBul } from "../src/lib/satisEkibi.js";
import { VIP_KAYNAKLAR } from "../src/lib/vipKaynaklar.js";

const PIPELINE_ID = 31227; // Bilimevi
const ASAMALAR = [
  { id: 217285, ad: "Yeni" },
  { id: 222366, ad: "Na1" },
  { id: 253357, ad: "Na2" },
  { id: 253358, ad: "Na3" },
  { id: 218701, ad: "Görüşme" },
  { id: 218702, ad: "İlgili" },
  { id: 217286, ad: "Yeni Kayıt" },
  { id: 217287, ad: "İlgisiz" },
  { id: 217288, ad: "Olumsuza Dönen" },
];
const SAYFA = 1000;
const KYLAS_LIMIT = 10000; // Kylas bir aramada en fazla 10.000 satır döndürür
const LISTE_SINIR = 1000;
const LISTE_ALANLARI = ["id", "firstName", "lastName", "ownerId", "pipelineStage", "createdAt", "latestActivityCreatedAt", "taskDueOn"];
const ONBELLEK_MS = 10 * 60 * 1000;
const onbellek = new Map(); // sıcak instance içinde 10 dk

function kural(field, operator, value, type = "long") {
  return { id: field, field, type, operator, value, group: false };
}

// Kylas hız sınırına (HTTP 429) takılınca bekleyip tekrar dener: en fazla 5 deneme, Retry-After varsa ona uyar
const bekle = ms => new Promise(c => setTimeout(c, ms));
const N8N_WEBHOOK = "https://n8n.bilimevi.cloud/webhook";

// Giriş yapan danışmanın Kylas token'ı (bağlantısı varsa) ya da null. E-posta token'dan; bağlantı n8n'den; şifre çözülüp giriş.
async function aktorToken(req) {
  const email = tokenCoz(req).kullanici?.email;
  if (!email || !process.env.N8N_PORTAL_TOKEN || !anahtarVar()) return null;
  let b;
  try {
    const r = await fetch(`${N8N_WEBHOOK}/kylas-baglanti-getir?email=${encodeURIComponent(email)}`, { headers: { "X-Portal-Token": process.env.N8N_PORTAL_TOKEN } });
    if (!r.ok) return null;
    b = (await r.json().catch(() => ({})))?.baglanti;
  } catch { return null; }
  if (!b?.sifreli) return null;
  try {
    const token = await kullaniciTokeni(email, coz(b.sifreli));
    return { email, token, kylasId: Number(b.kylasId) || null };
  } catch (e) { console.warn(`[token] ${email}: ${e.message}`); return null; }
}

// Bearer token'la Kylas'a yazar (429'da tekrar dener). Kullanıcı token'ı api-key'den bağımsız gitmeli.
async function bearerYaz(url, token, method, govde) {
  for (let d = 1; ; d++) {
    const r = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(govde) });
    if (r.status === 429 && d < 4) { await bekle(1200 * d); continue; }
    return r;
  }
}

// ---- Kylas hız sınırı ----
// Kylas yanıt başlıkları: x-ratelimit-burst-capacity 10, x-ratelimit-replenish-rate 5 (saniyede); her istek 2 birim düşüyor
// (x-ratelimit-remaining her istekte 2 azalıyor), yani gerçek sınır saniyede ~2,5 istek. Bu sunucu örneğinden giden
// istekler tek kovadan jeton alır; kova saniyede KOVA.hiz jeton dolar, en fazla KOVA.kapasite birikir. Sıra korunur (FIFO).
const KOVA = { kapasite: 4, hiz: Number(process.env.KYLAS_ISTEK_HIZI) || 2.2, jeton: 4, son: Date.now(), zincir: Promise.resolve() };
function jetonAl() {
  const sira = KOVA.zincir.then(async () => {
    for (;;) {
      const simdi = Date.now();
      KOVA.jeton = Math.min(KOVA.kapasite, KOVA.jeton + ((simdi - KOVA.son) / 1000) * KOVA.hiz);
      KOVA.son = simdi;
      if (KOVA.jeton >= 1) { KOVA.jeton -= 1; return; }
      await bekle(Math.ceil(((1 - KOVA.jeton) / KOVA.hiz) * 1000));
    }
  });
  KOVA.zincir = sira.catch(() => {});
  return sira;
}
// Kylas'a giden her istek buradan: jeton bekler, 429'da kovayı boşaltır ve artan aralıklarla 6 kereye kadar tekrar dener.
export async function kylasIstek(url, ayar = {}) {
  for (let deneme = 1; ; deneme++) {
    await jetonAl();
    const r = await fetch(url, { ...ayar, headers: { "api-key": process.env.KYLAS_API_KEY, Accept: "application/json", ...(ayar.headers || {}) } });
    if (r.status !== 429 || deneme >= 6) return r;
    KOVA.jeton = 0; // diğer bekleyenler de yavaşlasın
    const sn = Number(r.headers?.get?.("retry-after"));
    await bekle(Number.isFinite(sn) && sn > 0 ? Math.min(sn, 10) * 1000 : 700 * deneme + Math.random() * 400);
  }
}
const YOGUN = "Kylas şu an yoğun, birkaç saniye sonra tekrar deneyin.";
async function kylasAra(kurallar, page, alanlar = ["id", "ownerId", "pipelineStage"], sirala = "id,asc", boyut = SAYFA) {
  for (let deneme = 1; ; deneme++) {
    const r = await kylasIstek(`https://api.kylas.io/v1/search/lead?page=${page}&size=${boyut}&sort=${sirala}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: alanlar, jsonRule: { condition: "AND", valid: true, rules: kurallar } }),
    });
    if (r.status === 429 && deneme < 5) {
      const sn = Number(r.headers?.get?.("retry-after"));
      await bekle(Number.isFinite(sn) && sn > 0 ? Math.min(sn, 10) * 1000 : 1200 * deneme);
      continue;
    }
    if (r.status === 429) throw new Error(YOGUN);
    if (!r.ok) throw new Error(`Kylas araması başarısız (HTTP ${r.status})`);
    return r.json();
  }
}

// Tüm sayfaları çeker (4'erli paralel). Toplam 10.000'i aşarsa null döner, çağıran parçalar.
async function hepsiniCek(kurallar, alanlar) {
  const ilk = await kylasAra(kurallar, 0, alanlar);
  const toplam = ilk.totalElements || 0;
  if (toplam > KYLAS_LIMIT) return null;
  const satirlar = [...(ilk.content || [])];
  const sayfaSayisi = Math.ceil(toplam / SAYFA);
  for (let p = 1; p < sayfaSayisi; p += 4) {
    const grup = [];
    for (let q = p; q < Math.min(p + 4, sayfaSayisi); q++) grup.push(kylasAra(kurallar, q, alanlar));
    (await Promise.all(grup)).forEach(d => satirlar.push(...(d.content || [])));
  }
  return satirlar;
}

// Kurala uyan data sayısı (satır çekmeden)
async function kylasSay(kurallar) {
  return (await kylasAra(kurallar, 0, ["id"], "id,asc", 1)).totalElements || 0;
}

// "Son N gün" oluşturma tarihi kuralı. Kylas last_n_days en fazla 180 gün kabul eder; daha uzunu tarih karşılaştırmasıyla.
const GUN_MS = 24 * 60 * 60 * 1000;
function tarihKurali(gun) {
  if (gun <= 180) return kural("createdAt", "last_n_days", gun, "date");
  const bas = new Date(Date.now() - gun * GUN_MS);
  bas.setUTCHours(0, 0, 0, 0);
  return kural("createdAt", "greater", bas.toISOString(), "date");
}
const gecerliGun = g => Number.isInteger(g) && g >= 1 && g <= 3650;
const gecerliSessiz = g => Number.isInteger(g) && g >= 0 && g <= 3650;

function metneCevir(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(div|p|li)>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n").trim();
}

// Portaldan girilen notlar Kylas'ta API anahtarının sahibi (Selman) adına kayıtlı; asıl yazan etikette
export const API_SAHIBI = 71430;
const PORTAL_ETIKET = /^\[([^\]\n]{2,80}) · Portal\]\s*/;
export function portalEtiketi(metin) {
  const m = String(metin || "").match(PORTAL_ETIKET);
  return m ? { yazan: m[1], metin: metin.slice(m[0].length) } : null;
}
const htmlKacir = v => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Kylas GET isteği (kylasIstek: sıra + 429'da tekrar deneme)
const kylasGet = url => kylasIstek(url);

const SON_NOT_SINIR = 50;
async function sonNotlar(req, res, yetki) {
  const ham = Array.isArray(req.body?.leadler) ? req.body.leadler : [];
  let leadler = ham.map(l => ({ id: Number(l?.id), ownerId: Number(l?.ownerId) })).filter(l => Number.isInteger(l.id) && Number.isInteger(l.ownerId));
  if (!leadler.length || leadler.length !== ham.length) return res.status(400).json({ error: "Data listesi gerekli." });
  if (leadler.length > SON_NOT_SINIR) return res.status(400).json({ error: `En fazla ${SON_NOT_SINIR} Data sorulabilir.` });
  // Admin değilse istekteki sahiplere güvenilmez: gerçek sahipler tek aramada okunur
  if (yetki.tur !== "admin") {
    const d = await kylasAra([kural("id", "in", leadler.map(l => l.id))], 0, ["id", "ownerId"]);
    const sahip = Object.fromEntries((d.content || []).map(l => [l.id, Number(l.ownerId)]));
    leadler = leadler.filter(l => sahip[l.id] !== undefined).map(l => ({ id: l.id, ownerId: sahip[l.id] }));
    if (!yetkiKontrol(yetki, [...new Set(leadler.map(l => l.ownerId))], res, "crm-rapor sonNotlar")) return;
  }
  const notlar = {};
  for (let i = 0; i < leadler.length; i += 4) {
    await Promise.all(leadler.slice(i, i + 4).map(async l => {
      const r = await kylasGet(`https://api.kylas.io/v1/notes/relation?targetEntityId=${l.id}&targetEntityType=LEAD&targetEntityOwnerId=${l.ownerId}&sort=createdAt,desc&page=0&size=1`);
      if (!r.ok) { notlar[l.id] = { hata: true }; return; }
      const d = await r.json();
      const n = (d.content || [])[0];
      const isimler = d.metaData?.idNameStore?.createdBy || {};
      const etiket = n && Number(n.createdBy) === API_SAHIBI ? portalEtiketi(metneCevir(n.description)) : null;
      notlar[l.id] = n ? { tarih: new Date(n.createdAt).toISOString(), yazan: etiket?.yazan || isimler[n.createdBy] || "", toplam: d.totalElements || 1 } : null;
    }));
  }
  return res.status(200).json({ notlar });
}

const notOnbellek = new Map(); // "notlar:leadId:boyut" -> { zaman, veri }, 45 sn
async function notlar(req, res, yetki) {
  const leadId = Number(req.body?.leadId);
  let ownerId = Number(req.body?.ownerId);
  if (!Number.isInteger(leadId) || !Number.isInteger(ownerId)) return res.status(400).json({ error: "leadId ve ownerId gerekli." });
  const boyut = req.body?.boyut === undefined ? 3 : Number(req.body.boyut);
  if (!Number.isInteger(boyut) || boyut < 1 || boyut > 20) return res.status(400).json({ error: "Geçersiz not sayısı." });
  // Admin değilse istekteki ownerId'ye güvenilmez, lead'in gerçek sahibi Kylas'tan okunur
  if (yetki.tur !== "admin") {
    const d = await kylasAra([kural("id", "equal", leadId)], 0, ["id", "ownerId"]);
    const lead = (d.content || [])[0];
    if (!lead) return res.status(404).json({ error: "Data bulunamadı." });
    ownerId = Number(lead.ownerId);
    if (!yetkiKontrol(yetki, [ownerId], res, "crm-rapor notlar")) return;
  }
  const anahtar = `notlar:${leadId}:${boyut}`;
  const eski = notOnbellek.get(anahtar);
  if (eski && Date.now() - eski.zaman < 45 * 1000) return res.status(200).json(eski.veri);
  // targetEntityOwnerId olmadan Kylas 400 döner
  const r = await kylasIstek(`https://api.kylas.io/v1/notes/relation?targetEntityId=${leadId}&targetEntityType=LEAD&targetEntityOwnerId=${ownerId}&sort=createdAt,desc&page=0&size=${boyut}`);
  if (r.status === 429) return res.status(503).json({ error: YOGUN });
  if (!r.ok) return res.status(502).json({ error: `Notlar alınamadı (HTTP ${r.status})` });
  const d = await r.json();
  const isimler = d.metaData?.idNameStore?.createdBy || {};
  const veri = {
    toplam: d.totalElements || 0,
    notlar: (d.content || []).map(n => {
      const metin = metneCevir(n.description);
      const etiket = Number(n.createdBy) === API_SAHIBI ? portalEtiketi(metin) : null;
      return { tarih: new Date(n.createdAt).toISOString(), yazan: etiket?.yazan || isimler[n.createdBy] || "", metin: etiket ? etiket.metin : metin, portal: !!etiket };
    }),
  };
  notOnbellek.set(anahtar, { zaman: Date.now(), veri });
  if (notOnbellek.size > 500) notOnbellek.delete(notOnbellek.keys().next().value);
  return res.status(200).json(veri);
}

// Takip edilmesi gereken açık aşamalar: Na1, Na2, Na3, Görüşme, İlgili
const TAKIP_ASAMALARI = [222366, 253357, 253358, 218701, 218702];
// Task zorunlu: İlgili aşamasındaki her data + VIP kaynaklı Görüşme datası (Na1-Na3'te hiç beklenmez)
const ILGILI = 218702;
const GORUSME = 218701;
const taskZorunlu = l => l.pipelineStage === ILGILI || (l.pipelineStage === GORUSME && VIP_KAYNAKLAR.includes(l.source));

const zaman = v => (v ? new Date(v).getTime() : null);
// Bir açık data'nın takip durumu: task zorunlu mu, task'ı ne durumda, takipsiz mi (kural v2.0)
function takipDurumu(l, simdi, sinir) {
  const task = zaman(l.taskDueOn);
  const zorunlu = taskZorunlu(l);
  const akt = zaman(l.latestActivityCreatedAt);
  return {
    zorunlu,
    taskTur: task && task >= simdi ? "ileri" : task ? "gecikmis" : "yok",
    // Zorunlu kümede task yoksa doğrudan takipsiz; diğerlerinde task yok + sessizlik
    takipsiz: !task && (zorunlu || !akt || akt < sinir),
  };
}

function sahipKurali(ownerIds) {
  return ownerIds.length === 1 ? kural("ownerId", "equal", ownerIds[0]) : kural("ownerId", "in", ownerIds);
}

// Kylas kullanıcılarının elle işaretlenen müsaitlik durumu (data ataması). 5 dk önbellek.
// Not: tekil kullanıcı sorgusu vardiya saatine göre de "müsait değil" döner; izin için liste sorgusu kullanılır.
// Sadece bitiş tarihli kapalılık izin sayılır (izin Kylas'ta süreli işaretleniyor).
let musaitlikOnbellek = null;
async function musaitlikGetir() {
  if (musaitlikOnbellek && Date.now() - musaitlikOnbellek.zaman < 5 * 60 * 1000) return musaitlikOnbellek.veri;
  const r = await kylasIstek("https://api.kylas.io/v1/users?page=0&size=200");
  if (!r.ok) throw new Error(`Kullanıcılar alınamadı (HTTP ${r.status})`);
  const veri = {};
  for (const u of (await r.json()).content || []) {
    const a = u.availabilityStatus?.recordAssignment;
    const izinli = !!(a && a.available === false && a.expirationDate && new Date(a.expirationDate).getTime() > Date.now());
    veri[u.id] = { musait: !izinli, bitis: izinli ? a.expirationDate : null };
  }
  musaitlikOnbellek = { zaman: Date.now(), veri };
  return veri;
}

const YENI = 217285;
const YENI_KAYIT = 217286;
const YENI_BEKLEME_MS = 24 * 60 * 60 * 1000;

async function degerlendirme(req, res, yetki) {
  const hamSahipler = Array.isArray(req.body?.ownerIds) ? req.body.ownerIds : [];
  const ownerIds = [...new Set(hamSahipler.map(Number))].filter(Number.isInteger).sort((a, b) => a - b);
  const gun = req.body?.gun ? Number(req.body.gun) : null; // null = tüm zamanlar
  const sessizGun = req.body?.sessizGun !== undefined && req.body?.sessizGun !== null ? Number(req.body.sessizGun) : 14;
  if (!ownerIds.length || ownerIds.length !== hamSahipler.length) return res.status(400).json({ error: "Danışman seçilmedi." });
  if (ownerIds.length > 100) return res.status(400).json({ error: "En fazla 100 danışman seçilebilir." });
  if (gun !== null && !gecerliGun(gun)) return res.status(400).json({ error: "Geçersiz dönem." });
  if (!gecerliSessiz(sessizGun)) return res.status(400).json({ error: "Geçersiz gün." });
  const hamKaynaklar = Array.isArray(req.body?.kaynaklar) ? req.body.kaynaklar : [];
  const kaynaklar = [...new Set(hamKaynaklar.map(Number))].filter(k => Number.isInteger(k) && k > 0).sort((a, b) => a - b);
  if (kaynaklar.length !== hamKaynaklar.length || kaynaklar.length > 30) return res.status(400).json({ error: "Geçersiz veri kaynağı." });
  if (["manager", "staff", "tanimsiz"].includes(yetki.tur)) {
    console.warn(`[yetki] crm-rapor degerlendirme: ${yetki.tur}${yetki.ad ? ` (${yetki.ad})` : ""} admin değil (${zorunluMu() ? "reddedildi" : "izleme, geçti"})`);
    if (zorunluMu()) return res.status(403).json({ error: "Performans Tablosu sadece yöneticilere açık." });
  }
  if (!yetkiKontrol(yetki, ownerIds, res, "crm-rapor degerlendirme")) return;

  const anahtar = `deg:${ownerIds.join(",")}:${kaynaklar.join(",")}:${gun || "tumu"}:${sessizGun}`;
  const kayit = onbellek.get(anahtar);
  if (kayit && Date.now() - kayit.zaman < ONBELLEK_MS) return res.status(200).json(kayit.veri);

  const temel = [sahipKurali(ownerIds), kural("pipeline", "equal", PIPELINE_ID)];
  if (kaynaklar.length) temel.push(kural("source", "in", kaynaklar));
  // Kylas hız sınırı yüzünden üç arama aynı anda değil iki dalgada yapılır
  const [acik, yeni, musaitlik] = await Promise.all([
    hepsiniCek([...temel, kural("pipelineStage", "in", TAKIP_ASAMALARI)], ["id", "ownerId", "pipelineStage", "source", "taskDueOn", "latestActivityCreatedAt"]),
    hepsiniCek([...temel, kural("pipelineStage", "equal", YENI)], ["id", "ownerId", "createdAt"]),
    musaitlikGetir().catch(() => null), // müsaitlik okunamazsa rapor yine gelir, herkes müsait sayılır
  ]);
  if (acik === null || yeni === null) return res.status(422).json({ error: "Seçimde 10.000'den fazla açık Data var, daha az kaynak seçin." });
  // Dönemdeki data ve kayıt: önce satırları çek, 10.000'i aşarsa danışman başına sayım sorgusu yap
  const donemKurallari = gun ? [...temel, tarihKurali(gun)] : temel;
  let kohort = await hepsiniCek(donemKurallari, ["id", "ownerId", "pipelineStage"]);
  let sayimlar = null;
  if (kohort === null) {
    sayimlar = Object.fromEntries(ownerIds.map(id => [id, { data: 0, kayit: 0 }]));
    const kayitlar = await hepsiniCek([...donemKurallari, kural("pipelineStage", "equal", YENI_KAYIT)], ["id", "ownerId"]);
    if (kayitlar === null) return res.status(422).json({ error: "Seçimde 10.000'den fazla kayıt var, daha kısa dönem seçin." });
    for (const l of kayitlar) if (sayimlar[l.ownerId]) sayimlar[l.ownerId].kayit++;
    for (let i = 0; i < ownerIds.length; i += 3) {
      const grup = ownerIds.slice(i, i + 3);
      const sayilar = await Promise.all(grup.map(id => kylasSay([kural("ownerId", "equal", id), ...donemKurallari.slice(1)])));
      grup.forEach((id, j) => { sayimlar[id].data = sayilar[j]; });
    }
    kohort = [];
  }

  const simdi = Date.now();
  const sinir = simdi - sessizGun * 24 * 60 * 60 * 1000;
  const bos = () => ({ acik: 0, takipsiz: 0, taskBeklenen: 0, ileriTask: 0, gecikmisTask: 0, taskYok: 0, yeni: 0, yeniBekleyen: 0, data: 0, kayit: 0, musait: true, izinBitis: null });
  const danismanlar = Object.fromEntries(ownerIds.map(id => [id, bos()]));
  for (const l of acik) {
    const d = danismanlar[l.ownerId]; if (!d) continue;
    const t = takipDurumu(l, simdi, sinir);
    d.acik++;
    if (t.zorunlu) { d.taskBeklenen++; d[t.taskTur === "ileri" ? "ileriTask" : t.taskTur === "gecikmis" ? "gecikmisTask" : "taskYok"]++; }
    if (t.takipsiz) d.takipsiz++;
  }
  for (const l of yeni) {
    const d = danismanlar[l.ownerId]; if (!d) continue;
    d.yeni++;
    if ((zaman(l.createdAt) || 0) < simdi - YENI_BEKLEME_MS) d.yeniBekleyen++;
  }
  for (const l of kohort) {
    const d = danismanlar[l.ownerId]; if (!d) continue;
    d.data++;
    if (l.pipelineStage === YENI_KAYIT) d.kayit++;
  }
  if (sayimlar) for (const id of ownerIds) Object.assign(danismanlar[id], sayimlar[id]);
  if (musaitlik) for (const id of ownerIds) {
    const m = musaitlik[id];
    if (m) { danismanlar[id].musait = m.musait; danismanlar[id].izinBitis = m.musait ? null : m.bitis; }
  }

  const veri = { danismanlar, gun, sessizGun, kaynaklar, musaitlikOkundu: !!musaitlik, guncellendi: new Date().toISOString() };
  onbellek.set(anahtar, { zaman: Date.now(), veri });
  return res.status(200).json(veri);
}

async function takip(req, res, yetki) {
  const hamSahipler = Array.isArray(req.body?.ownerIds) ? req.body.ownerIds : [req.body?.ownerId];
  const ownerIds = [...new Set(hamSahipler.map(Number))].filter(Number.isInteger);
  const sessizGun = req.body?.sessizGun !== undefined && req.body?.sessizGun !== null ? Number(req.body.sessizGun) : 14;
  if (!ownerIds.length || ownerIds.length !== hamSahipler.length) return res.status(400).json({ error: "Danışman seçilmedi." });
  if (ownerIds.length > 100) return res.status(400).json({ error: "En fazla 100 danışman seçilebilir." });
  if (!gecerliSessiz(sessizGun)) return res.status(400).json({ error: "Geçersiz gün." });
  const hamKaynaklar = Array.isArray(req.body?.kaynaklar) ? req.body.kaynaklar : [];
  const kaynaklar = [...new Set(hamKaynaklar.map(Number))].filter(k => Number.isInteger(k) && k > 0);
  if (kaynaklar.length !== hamKaynaklar.length || kaynaklar.length > 30) return res.status(400).json({ error: "Geçersiz veri kaynağı." });
  const kampanya = typeof req.body?.kampanya === "string" ? req.body.kampanya.trim() : "";
  if (kampanya.length > 100) return res.status(400).json({ error: "Campaign Name araması en fazla 100 karakter olabilir." });
  if (!yetkiKontrol(yetki, ownerIds, res, "crm-rapor takip")) return;

  const kurallar = [sahipKurali(ownerIds), kural("pipeline", "equal", PIPELINE_ID), kural("pipelineStage", "in", TAKIP_ASAMALARI)];
  if (kaynaklar.length) kurallar.push(kural("source", "in", kaynaklar));
  if (kampanya) kurallar.push(kural("utmCampaign", "contains", kampanya, "string"));
  const leadler = await hepsiniCek(kurallar, [...LISTE_ALANLARI, "source", "utmCampaign"]);
  if (leadler === null) return res.status(422).json({ error: "Seçimde 10.000'den fazla açık Data var, daha az danışman ya da kaynak seçin." });

  const simdi = Date.now();
  const sinir = simdi - sessizGun * 24 * 60 * 60 * 1000;
  const bosOzet = () => ({ toplam: 0, taskBeklenen: 0, ileriTask: 0, gecikmisTask: 0, taskYok: 0, takipsiz: 0 });
  const ozet = bosOzet();
  const danismanlar = Object.fromEntries(ownerIds.map(id => [id, bosOzet()]));
  const acik = [];
  const satir = l => ({
    id: l.id, ad: [l.firstName, l.lastName].filter(Boolean).join(" "), ownerId: l.ownerId, asama: l.pipelineStage, kaynak: l.source,
    kampanya: l.utmCampaign || "", olusturma: l.createdAt || null, sonAktivite: l.latestActivityCreatedAt || null, sonrakiTask: l.taskDueOn || null,
  });
  for (const l of leadler) {
    const d = danismanlar[l.ownerId] || (danismanlar[l.ownerId] = bosOzet());
    const say = alan => { ozet[alan]++; d[alan]++; };
    say("toplam");
    const t = takipDurumu(l, simdi, sinir);
    if (t.zorunlu) {
      say("taskBeklenen");
      if (t.taskTur === "ileri") say("ileriTask");
      else if (t.taskTur === "gecikmis") say("gecikmisTask");
      else say("taskYok");
    }
    if (t.takipsiz) say("takipsiz");
    acik.push({ ...satir(l), zorunlu: t.zorunlu, taskTur: t.taskTur, takipsiz: t.takipsiz });
  }
  // Varsayılan sıra: son etkinliği en eski olan önce (hiç olmayan en başta)
  acik.sort((a, b) => (zaman(a.sonAktivite) || 0) - (zaman(b.sonAktivite) || 0));
  return res.status(200).json({ ozet, danismanlar, sessizGun, kaynaklar, kampanya, acik, guncellendi: new Date().toISOString() });
}

async function liste(req, res, kurallar, yetki) {
  const ownerIds = (Array.isArray(req.body?.ownerIds) ? req.body.ownerIds : []).map(Number).filter(Number.isInteger);
  const asama = req.body?.asama ? Number(req.body.asama) : null;
  if (!ownerIds.length) return res.status(400).json({ error: "Danışman seçilmedi." });
  if (!yetkiKontrol(yetki, ownerIds, res, "crm-rapor liste")) return;
  if (asama !== null && !ASAMALAR.some(a => a.id === asama)) return res.status(400).json({ error: "Geçersiz aşama." });

  const k = [...kurallar, kural("ownerId", "in", ownerIds)];
  if (asama) k.push(kural("pipelineStage", "equal", asama));
  const d = await kylasAra(k, 0, [...LISTE_ALANLARI, "source"], "createdAt,desc");
  const leadler = (d.content || []).slice(0, LISTE_SINIR).map(l => ({
    id: l.id,
    ad: [l.firstName, l.lastName].filter(Boolean).join(" "),
    ownerId: l.ownerId,
    asama: l.pipelineStage,
    kaynak: l.source ?? null,
    olusturma: l.createdAt || null,
    sonAktivite: l.latestActivityCreatedAt || null,
    sonrakiTask: l.taskDueOn || null,
  }));
  return res.status(200).json({ toplam: d.totalElements || 0, leadler });
}

// ---- Son N gün özeti (tek danışman) ----
const OZET_LISTE_SINIR = 300;
const TASK_TAMAM = 2614528;
const TASK_ACIK = 2614526;
const TASK_SURECTE = 2614527;
const TASK_IPTAL = 2614529;
export const TASK_TURLERI = { 2614522: "Call", 2614523: "Follow Up", 2614524: "Reminder", 2614525: "Todo" };
const tarihSonrasi = (alan, iso) => kural(alan, "greater", iso, "date");

// Dönemde güncellenen tüm task'lar (updatedAt'e göre yeniden eskiye, dönem dışına çıkınca durur)
async function donemTasklari(basMs) {
  const sonuc = [];
  for (let page = 0; page < 20; page++) {
    const r = await kylasGet(`https://api.kylas.io/v1/tasks?page=${page}&size=1000&sort=updatedAt,desc`);
    if (r.status === 429) throw new Error(YOGUN);
    if (!r.ok) throw new Error(`Task'lar alınamadı (HTTP ${r.status})`);
    const d = await r.json();
    const icerik = d.content || [];
    let bitti = !icerik.length;
    for (const t of icerik) {
      if (zaman(t.updatedAt) < basMs) { bitti = true; break; }
      sonuc.push(t);
    }
    if (bitti || page + 1 >= (d.totalPages || 0)) break;
  }
  return sonuc;
}
const taskLead = t => (Array.isArray(t.relation) ? t.relation : []).find(x => x.targetEntityType === "LEAD")?.targetEntityId;

// Danışmanın dönemde yazdığı notlar (Kylas not araması; sadece hangi dataya yazıldığı kullanılır, not metni kullanılmaz)
// Danışmanın dönemde yazdığı notların data id'leri: kendi adına kayıtlı notlar + portaldan girdiği notlar
// (Selman adına kayıtlı, etiketinde danışmanın adı). ad verilmezse sadece kendi adına kayıtlılar.
async function donemNotlari(ownerId, bas, ad = null) {
  const kendi = await notAra(ownerId, bas);
  if (!ad || ownerId === API_SAHIBI) return kendi.map(n => n.lead);
  const hedef = kucukHarf(ad);
  const portal = (await notAra(API_SAHIBI, bas)).filter(n => kucukHarf(portalEtiketi(metneCevir(n.description))?.yazan) === hedef);
  return [...kendi, ...portal].map(n => n.lead);
}
const kucukHarf = v => String(v || "").trim().toLocaleLowerCase("tr-TR");

async function notAra(createdBy, bas) {
  const sonuc = [];
  for (let page = 0; page < 10; page++) {
    for (let deneme = 1; ; deneme++) {
      const r = await kylasIstek(`https://api.kylas.io/v1/notes/search?page=${page}&size=1000&sort=createdAt,desc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonRule: { condition: "AND", valid: true, rules: [kural("createdBy", "equal", createdBy), ...(bas ? [tarihSonrasi("createdAt", bas)] : [])] } }),
      });
      if (r.status === 429 && deneme < 5) { await bekle(1200 * deneme); continue; }
      if (r.status === 429) throw new Error(YOGUN);
      if (!r.ok) throw new Error(`Notlar alınamadı (HTTP ${r.status})`);
      const d = await r.json();
      (d.content || []).forEach(n => sonuc.push({ lead: (n.relations || []).find(x => x.entityType === "LEAD")?.entityId ?? null, description: n.description }));
      if (page + 1 >= (d.totalPages || 0)) return sonuc;
      break;
    }
  }
  return sonuc;
}

// Verilen data id'lerinden kaynağı listede olanlar (1000'erli aramalar)
async function kaynaktakiler(idler, kaynaklar) {
  const sonuc = new Set();
  for (let i = 0; i < idler.length; i += 1000) {
    const d = await kylasAra([kural("id", "in", idler.slice(i, i + 1000)), kural("source", "in", kaynaklar)], 0, ["id"]);
    (d.content || []).forEach(l => sonuc.add(l.id));
  }
  return sonuc;
}

async function ozet(req, res, yetki) {
  const ownerId = Number(req.body?.ownerId);
  const gun = req.body?.gun === null || req.body?.gun === undefined ? null : Number(req.body.gun);
  const hamKaynaklar = Array.isArray(req.body?.kaynaklar) ? req.body.kaynaklar : [];
  const kaynaklar = [...new Set(hamKaynaklar.map(Number))].filter(k => Number.isInteger(k) && k > 0).sort((x, y) => x - y);
  if (!Number.isInteger(ownerId)) return res.status(400).json({ error: "Danışman seçilmedi." });
  if (gun !== null && !gecerliGun(gun)) return res.status(400).json({ error: "Geçersiz gün." });
  if (kaynaklar.length !== hamKaynaklar.length || kaynaklar.length > 30) return res.status(400).json({ error: "Geçersiz veri kaynağı." });
  if (!yetkiKontrol(yetki, [ownerId], res, "crm-rapor ozet")) return;

  const anahtar = `ozet:${ownerId}:${gun}:${kaynaklar.join(",")}`;
  const eski = onbellek.get(anahtar);
  if (eski && Date.now() - eski.zaman < 2 * 60 * 1000) return res.status(200).json(eski.veri);

  const bas = gun ? new Date(Date.now() - gun * GUN_MS).toISOString() : null;
  const basMs = bas ? zaman(bas) : 0;
  const yeniKurallar = [kural("ownerId", "equal", ownerId), kural("pipeline", "equal", PIPELINE_ID)];
  if (bas) yeniKurallar.push(tarihSonrasi("createdAt", bas));
  if (kaynaklar.length) yeniKurallar.push(kural("source", "in", kaynaklar));
  const danismanAdi = dizinGetir().then(dz => [...dz.kisiler.values()].find(k => k.kylasId === ownerId)?.ad || null).catch(() => null);
  let [yeniler, notLeadleri, tasklar] = await Promise.all([
    hepsiniCek(yeniKurallar, [...LISTE_ALANLARI, "source"]),
    danismanAdi.then(ad => donemNotlari(ownerId, bas, ad)),
    donemTasklari(basMs),
  ]);
  if (yeniler === null) return res.status(422).json({ error: "Dönem çok kalabalık, daha kısa bir süre seçin." });
  // Kaynak seçiliyse not ve task'lar sadece o kaynaklardaki datalar için sayılır
  if (kaynaklar.length) {
    const ilgili = new Set(notLeadleri.filter(Boolean));
    tasklar.forEach(t => { const l = taskLead(t); if (l) ilgili.add(l); });
    const izinli = await kaynaktakiler([...ilgili], kaynaklar);
    notLeadleri = notLeadleri.filter(id => id && izinli.has(id));
    tasklar = tasklar.filter(t => izinli.has(taskLead(t)));
  }

  const adK = ownerId === API_SAHIBI ? null : kucukHarf(await danismanAdi);
  const yeniIdler = new Set(yeniler.map(l => l.id));
  const taskliLead = new Set();
  let acilan = 0, tamamlanan = 0;
  for (const t of tasklar) {
    const lead = taskLead(t);
    if (lead && yeniIdler.has(lead)) taskliLead.add(lead);
    if (zaman(t.createdAt) >= basMs && (t.createdBy === ownerId || (adK && Number(t.createdBy) === API_SAHIBI && kucukHarf(portalEtiketi(metneCevir(t.description))?.yazan) === adK))) acilan++;
    if (t.status === TASK_TAMAM && Number(t.assignedTo ?? t.ownerId) === ownerId && zaman(t.completedAt) >= basMs) tamamlanan++;
  }
  const notSayisi = {};
  notLeadleri.forEach(id => { if (id) notSayisi[id] = (notSayisi[id] || 0) + 1; });
  const asamalar = {};
  yeniler.forEach(l => { asamalar[l.pipelineStage] = (asamalar[l.pipelineStage] || 0) + 1; });
  const simdi = Date.now();
  const satir = l => ({
    id: l.id, ad: [l.firstName, l.lastName].filter(Boolean).join(" "), asama: l.pipelineStage, kaynak: l.source,
    olusturma: l.createdAt, task: taskliLead.has(l.id), not: notSayisi[l.id] || 0,
    yeniBekliyor: l.pipelineStage === YENI && simdi - zaman(l.createdAt) > YENI_BEKLEME_MS,
  });
  const liste = yeniler.sort((a, b) => zaman(b.createdAt) - zaman(a.createdAt)).map(satir);
  const veri = {
    gun, baslangic: bas,
    aktivite: { not: notLeadleri.length, notluData: Object.keys(notSayisi).length, taskAcilan: acilan, taskTamamlanan: tamamlanan },
    yeni: {
      toplam: yeniler.length, asamalar,
      taskli: liste.filter(l => l.task).length,
      notlu: liste.filter(l => l.not).length,
      dokunulmamis: liste.filter(l => l.asama === YENI && !l.task && !l.not).length,
      liste: liste.slice(0, OZET_LISTE_SINIR), kesildi: liste.length > OZET_LISTE_SINIR,
    },
  };
  onbellek.set(anahtar, { zaman: Date.now(), veri });
  return res.status(200).json(veri);
}

// ---- Danışman ata (data sahibini değiştir) ----
const ATA_SINIR = 25;
async function ata(req, res, yetki) {
  // Yazma işlemi: izleme modu yok
  if (yetki.tur === "anonim") return res.status(401).json({ error: "Oturum doğrulanamadı. Lütfen çıkış yapıp tekrar giriş yapın." });
  if (yetki.tur === "hata") return res.status(503).json({ error: "Yetki bilgisi okunamadı, biraz sonra tekrar deneyin." });
  if (!["admin", "manager"].includes(yetki.tur)) return res.status(403).json({ error: "Danışman atama yetkiniz yok." });

  const ham = Array.isArray(req.body?.leadIds) ? req.body.leadIds : [];
  const leadIds = [...new Set(ham.map(Number))].filter(n => Number.isInteger(n) && n > 0);
  const yeniSahip = Number(req.body?.yeniSahip);
  if (!leadIds.length || leadIds.length !== ham.length) return res.status(400).json({ error: "Data seçilmedi." });
  if (leadIds.length > ATA_SINIR) return res.status(400).json({ error: `Tek seferde en fazla ${ATA_SINIR} Data aktarılabilir.` });
  if (!Number.isInteger(yeniSahip)) return res.status(400).json({ error: "Danışman seçilmedi." });

  // Hedef satış ekibinden olmalı; manager için kendi şubesinden
  const dizin = await dizinGetir();
  const hedef = [...dizin.kisiler.values()].find(k => k.kylasId === yeniSahip && satisBul(k.ad));
  if (!hedef) return res.status(400).json({ error: "Seçilen kişi satış ekibinde değil." });
  if (yetki.tur === "manager" && !yetki.idler.has(yeniSahip)) return res.status(403).json({ error: "Sadece kendi şubenizdeki danışmana atayabilirsiniz." });

  const d = await kylasAra([kural("id", "in", leadIds)], 0, ["id", "ownerId"]);
  const leadler = d.content || [];
  const sahipler = new Map(leadler.map(l => [l.id, Number(l.ownerId)]));
  if (yetki.tur === "manager") {
    const disarida = leadler.filter(l => !yetki.idler.has(Number(l.ownerId)));
    if (disarida.length) return res.status(403).json({ error: "Seçilen Datalardan bazıları şubenizdeki danışmanlara ait değil." });
  }

  const sonuc = { aktarilan: [], zatenSahibi: [], bulunamayan: leadIds.filter(id => !sahipler.has(id)), hatali: [] };
  for (const id of leadIds) {
    if (!sahipler.has(id)) continue;
    if (sahipler.get(id) === yeniSahip) { sonuc.zatenSahibi.push(id); continue; }
    if (sonuc.aktarilan.length || sonuc.hatali.length) await bekle(700);
    let r;
    for (let deneme = 1; ; deneme++) {
      r = await kylasIstek(`https://api.kylas.io/v1/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json-patch+json" },
        body: JSON.stringify([{ op: "add", path: "/ownerId", value: yeniSahip }]),
      });
      if (r.status === 429 && deneme < 5) { await bekle(1500 * deneme); continue; }
      break;
    }
    if (r.ok) {
      sonuc.aktarilan.push(id);
      console.log(`[ata] ${yetki.ad}: data ${id} ${sahipler.get(id)} -> ${yeniSahip}`);
    } else {
      sonuc.hatali.push({ id, hata: `HTTP ${r.status}` });
      console.warn(`[ata] ${yetki.ad}: data ${id} aktarılamadı (HTTP ${r.status})`);
    }
  }
  if (sonuc.aktarilan.length) onbellek.clear(); // sayılar değişti
  return res.status(200).json(sonuc);
}

// ---- Data detayı (Ele al ekranı) ----
async function detay(req, res, yetki) {
  if (yetki.tur === "anonim") return res.status(401).json({ error: "Oturum doğrulanamadı. Lütfen çıkış yapıp tekrar giriş yapın." });
  if (yetki.tur === "hata") return res.status(503).json({ error: "Yetki bilgisi okunamadı, biraz sonra tekrar deneyin." });
  if (!["admin", "manager", "staff"].includes(yetki.tur)) return res.status(403).json({ error: "Bu Data'yı görme yetkiniz yok." });
  const leadId = Number(req.body?.leadId);
  if (!Number.isInteger(leadId) || leadId <= 0) return res.status(400).json({ error: "Data seçilmedi." });
  const r = await kylasGet(`https://api.kylas.io/v1/leads/${leadId}`);
  if (r.status === 404) return res.status(404).json({ error: "Data bulunamadı." });
  if (r.status === 429) return res.status(503).json({ error: YOGUN });
  if (!r.ok) return res.status(502).json({ error: `Data bilgileri alınamadı (HTTP ${r.status})` });
  const l = await r.json();
  if (yetki.tur !== "admin" && !yetki.idler.has(Number(l.ownerId))) return res.status(403).json({ error: "Bu Data'yı görme yetkiniz yok." });
  console.log(`[detay] ${yetki.ad}: data ${leadId}`);
  const sirala = a => [...(a || [])].sort((x, y) => Number(!!y.primary) - Number(!!x.primary));
  return res.status(200).json({
    id: l.id,
    ad: [l.firstName, l.lastName].filter(Boolean).join(" "),
    telefonlar: sirala(l.phoneNumbers).map(p => `${p.dialCode || ""}${p.value || ""}`).filter(Boolean),
    epostalar: sirala(l.emails).map(e => e.value).filter(Boolean),
    sehir: l.city || "",
    ownerId: l.ownerId ?? null,
    olusturma: l.createdAt || null,
    kampanya: l.utmCampaign || "",
    kaynak: l.source ?? null,
  });
}

// ---- Task'lar (Toplu Data Follow Up) ----
let taskOnbellek = null; // { zaman, liste }
async function tumTasklar() {
  if (taskOnbellek && Date.now() - taskOnbellek.zaman < 90 * 1000) return taskOnbellek.liste;
  const liste = [];
  for (let page = 0; page < 30; page++) {
    const r = await kylasGet(`https://api.kylas.io/v1/tasks?page=${page}&size=1000&sort=updatedAt,desc`);
    if (r.status === 429) throw new Error(YOGUN);
    if (!r.ok) throw new Error(`Task'lar alınamadı (HTTP ${r.status})`);
    const d = await r.json();
    liste.push(...(d.content || []));
    if (page + 1 >= (d.totalPages || 0)) break;
  }
  taskOnbellek = { zaman: Date.now(), liste };
  return liste;
}

// Yazma ve kişisel veri işlemlerinde ortak kontrol: izleme modu yok. Hata varsa yanıtı gönderip false döner.
function yazmaYetkisi(yetki, res) {
  if (yetki.tur === "anonim") { res.status(401).json({ error: "Oturum doğrulanamadı. Lütfen çıkış yapıp tekrar giriş yapın." }); return false; }
  if (yetki.tur === "hata") { res.status(503).json({ error: "Yetki bilgisi okunamadı, biraz sonra tekrar deneyin." }); return false; }
  if (!["admin", "manager", "staff"].includes(yetki.tur) || !yetki.ad) { res.status(403).json({ error: "Bu işlem için yetkiniz yok." }); return false; }
  return true;
}
async function leadSahibi(leadId) {
  const d = await kylasAra([kural("id", "equal", leadId)], 0, ["id", "ownerId"]);
  const l = (d.content || [])[0];
  return l ? Number(l.ownerId) : null;
}
const sahipYetkili = (yetki, ownerId) => yetki.tur === "admin" || yetki.idler.has(Number(ownerId));

function taskSatiri(t, simdi = Date.now()) {
  const durum = t.status === TASK_TAMAM ? "tamam" : t.status === TASK_IPTAL ? "iptal" : t.status === TASK_SURECTE ? "surecte" : "acik";
  const aciklama = metneCevir(t.description);
  const etiket = Number(t.createdBy) === API_SAHIBI ? portalEtiketi(aciklama) : null;
  return {
    id: t.id, ad: t.name || "", tarih: t.dueDate || null, durum, tur: TASK_TURLERI[t.type] || "", turId: t.type ?? null,
    atanan: t.assignedTo ?? t.ownerId ?? null, tamamlanma: t.completedAt || null,
    gecikmis: (durum === "acik" || durum === "surecte") && !!t.dueDate && zaman(t.dueDate) < simdi,
    aciklama: etiket ? etiket.metin : aciklama, portalYazan: etiket?.yazan || null,
  };
}

async function tasklar(req, res, yetki) {
  if (!yazmaYetkisi(yetki, res)) return;
  const leadId = Number(req.body?.leadId);
  if (!Number.isInteger(leadId) || leadId <= 0) return res.status(400).json({ error: "Data seçilmedi." });
  const sahip = await leadSahibi(leadId);
  if (sahip === null) return res.status(404).json({ error: "Data bulunamadı." });
  if (!sahipYetkili(yetki, sahip)) return res.status(403).json({ error: "Bu Data'yı görme yetkiniz yok." });
  const simdi = Date.now();
  const satirlar = (await tumTasklar()).filter(t => taskLead(t) === leadId).map(t => taskSatiri(t, simdi));
  const acik = satirlar.filter(t => t.durum === "acik" || t.durum === "surecte").sort((a, b) => zaman(a.tarih) - zaman(b.tarih));
  const kapali = satirlar.filter(t => !acik.includes(t)).sort((a, b) => zaman(b.tamamlanma || b.tarih) - zaman(a.tamamlanma || a.tarih));
  return res.status(200).json({ tasklar: [...acik, ...kapali].slice(0, 20), toplam: satirlar.length });
}

async function kylasYaz(url, method, govde) {
  for (let deneme = 1; ; deneme++) {
    const r = await kylasIstek(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(govde),
    });
    if (r.status === 429 && deneme < 5) { await bekle(1500 * deneme); continue; }
    return r;
  }
}

async function taskEkle(req, res, yetki) {
  if (!yazmaYetkisi(yetki, res)) return;
  const leadId = Number(req.body?.leadId);
  const ad = String(req.body?.ad ?? "").trim();
  const tarih = new Date(String(req.body?.tarih ?? ""));
  const tur = req.body?.tur === undefined ? 2614523 : Number(req.body.tur);
  if (!Number.isInteger(leadId) || leadId <= 0) return res.status(400).json({ error: "Data seçilmedi." });
  if (ad.length < 2 || ad.length > 200) return res.status(400).json({ error: "Task adı 2-200 karakter olmalı." });
  if (isNaN(tarih) || tarih.getTime() < Date.now() - GUN_MS || tarih.getTime() > Date.now() + 400 * GUN_MS) return res.status(400).json({ error: "Geçerli bir task tarihi seçin." });
  if (!TASK_TURLERI[tur]) return res.status(400).json({ error: "Geçersiz task türü." });
  const sahip = await leadSahibi(leadId);
  if (sahip === null) return res.status(404).json({ error: "Data bulunamadı." });
  if (!sahipYetkili(yetki, sahip)) return res.status(403).json({ error: "Bu Data'ya task açma yetkiniz yok." });

  const taskGovde = { name: ad, type: tur, status: TASK_ACIK, assignedTo: sahip, dueDate: tarih.toISOString(), relation: [{ targetEntityId: leadId, targetEntityType: "LEAD" }], customFieldValues: {} };
  const akt = await aktorToken(req);
  let t = null, yontem = "etiket";
  if (akt) {
    for (let deneme = 1; deneme <= 2; deneme++) {
      const br = await bearerYaz("https://api.kylas.io/v1/tasks/", akt.token, "POST", { ...taskGovde, description: "" });
      if (br.status === 401 && deneme === 1) { tokenGecersiz(akt.email); const a2 = await aktorToken(req); if (a2) { akt.token = a2.token; continue; } }
      if (br.ok) { t = await br.json().catch(() => ({})); yontem = "kullanici"; }
      break;
    }
  }
  if (!t) {
    const r = await kylasYaz("https://api.kylas.io/v1/tasks/", "POST", { ...taskGovde, description: `[${htmlKacir(yetki.ad)} · Portal]` });
    if (!r.ok) {
      console.warn(`[task] ${yetki.ad}: data ${leadId} task açılamadı (HTTP ${r.status})`);
      return res.status(r.status === 429 ? 503 : 502).json({ error: r.status === 429 ? YOGUN : `Task Kylas'ta açılamadı (HTTP ${r.status}).` });
    }
    t = await r.json().catch(() => ({}));
  }
  console.log(`[task] ${yetki.ad} (${yontem}): data ${leadId} task ${t.id ?? "?"} açtı -> ${sahip}`);
  taskOnbellek = null;
  onbellek.clear(); // takip ve özet sayıları değişti
  return res.status(200).json({ task: taskSatiri({ ...t, name: t.name ?? ad, dueDate: t.dueDate ?? tarih.toISOString(), type: t.type ?? tur, status: t.status ?? TASK_ACIK, assignedTo: t.assignedTo ?? sahip, createdBy: t.createdBy ?? API_SAHIBI, description: t.description ?? `[${yetki.ad} · Portal]` }) });
}

async function taskTamamla(req, res, yetki) {
  if (!yazmaYetkisi(yetki, res)) return;
  const taskId = Number(req.body?.taskId);
  if (!Number.isInteger(taskId) || taskId <= 0) return res.status(400).json({ error: "Task seçilmedi." });
  const g = await kylasGet(`https://api.kylas.io/v1/tasks/${taskId}`);
  if (g.status === 404) return res.status(404).json({ error: "Task bulunamadı." });
  if (g.status === 429) return res.status(503).json({ error: YOGUN });
  if (!g.ok) return res.status(502).json({ error: `Task okunamadı (HTTP ${g.status})` });
  const t = await g.json();
  const leadId = taskLead(t);
  if (yetki.tur !== "admin") {
    const sahip = leadId ? await leadSahibi(leadId) : null;
    if (!(sahip !== null && sahipYetkili(yetki, sahip)) && !yetki.idler.has(Number(t.assignedTo))) return res.status(403).json({ error: "Bu task'ı tamamlama yetkiniz yok." });
  }
  if (t.status === TASK_TAMAM) return res.status(200).json({ task: taskSatiri(t), zaten: true });
  const putGovde = { name: t.name, dueDate: t.dueDate, type: t.type, status: TASK_TAMAM, priority: t.priority, reminder: t.reminder,
    assignedTo: t.assignedTo, description: t.description, relation: t.relation, customFieldValues: t.customFieldValues || {} };
  const akt = await aktorToken(req);
  let yeni = null, yontem = "etiket";
  if (akt) {
    for (let deneme = 1; deneme <= 2; deneme++) {
      const br = await bearerYaz(`https://api.kylas.io/v1/tasks/${taskId}`, akt.token, "PUT", putGovde);
      if (br.status === 401 && deneme === 1) { tokenGecersiz(akt.email); const a2 = await aktorToken(req); if (a2) { akt.token = a2.token; continue; } }
      if (br.ok) { yeni = await br.json().catch(() => ({})); yontem = "kullanici"; }
      break;
    }
  }
  if (!yeni) {
    const r = await kylasYaz(`https://api.kylas.io/v1/tasks/${taskId}`, "PUT", putGovde);
    if (!r.ok) {
      console.warn(`[task] ${yetki.ad}: task ${taskId} tamamlanamadı (HTTP ${r.status})`);
      return res.status(r.status === 429 ? 503 : 502).json({ error: r.status === 429 ? YOGUN : `Task Kylas'ta tamamlanamadı (HTTP ${r.status}).` });
    }
    yeni = await r.json().catch(() => ({}));
  }
  console.log(`[task] ${yetki.ad} (${yontem}): task ${taskId} (data ${leadId ?? "-"}) tamamlandı`);
  taskOnbellek = null;
  onbellek.clear();
  return res.status(200).json({ task: taskSatiri({ ...t, ...yeni, status: TASK_TAMAM, completedAt: yeni.completedAt || new Date().toISOString() }) });
}

// ---- Bugünkü portal aktivitesi ----
const aktiviteOnbellek = new Map(); // ownerIds -> { zaman, veri }
function bugunBaslangici() {
  const tr = new Date(Date.now() + 3 * 60 * 60 * 1000); // Türkiye UTC+3
  tr.setUTCHours(0, 0, 0, 0);
  return new Date(tr.getTime() - 3 * 60 * 60 * 1000);
}
async function portalAktivite(req, res, yetki) {
  const ham = Array.isArray(req.body?.ownerIds) ? req.body.ownerIds : [];
  const ownerIds = [...new Set(ham.map(Number))].filter(Number.isInteger);
  if (!ownerIds.length || ownerIds.length !== ham.length || ownerIds.length > 100) return res.status(400).json({ error: "Danışman seçilmedi." });
  if (!yetkiKontrol(yetki, ownerIds, res, "crm-rapor portalAktivite")) return;
  const anahtar = [...ownerIds].sort((a, b) => a - b).join(",");
  const eski = aktiviteOnbellek.get(anahtar);
  if (eski && Date.now() - eski.zaman < 60 * 1000) return res.status(200).json(eski.veri);

  const bas = bugunBaslangici().toISOString();
  // Bağlantısı olmayan danışmanlar: Selman adına "[Ad · Portal]" etiketli notlar
  const etiketli = (await notAra(API_SAHIBI, bas)).filter(n => n.lead && portalEtiketi(metneCevir(n.description)));
  // Bağlı danışmanlar: notu kendi id'siyle açar (etiketsiz)
  const kendi = [];
  for (const id of ownerIds) (await notAra(id, bas)).forEach(n => { if (n.lead) kendi.push(n); });
  const notlar = [...etiketli, ...kendi];
  const leadIdler = [...new Set(notlar.map(n => n.lead))];
  const sahip = new Map();
  for (let i = 0; i < leadIdler.length; i += 1000) {
    const d = await kylasAra([kural("id", "in", leadIdler.slice(i, i + 1000))], 0, ["id", "ownerId"]);
    (d.content || []).forEach(l => sahip.set(l.id, Number(l.ownerId)));
  }
  const istenen = new Set(ownerIds);
  const bizim = notlar.filter(n => istenen.has(sahip.get(n.lead)));
  const veri = { veri: new Set(bizim.map(n => n.lead)).size, not: bizim.length, baslangic: bugunBaslangici().toISOString() };
  aktiviteOnbellek.set(anahtar, { zaman: Date.now(), veri });
  if (aktiviteOnbellek.size > 200) aktiviteOnbellek.delete(aktiviteOnbellek.keys().next().value);
  return res.status(200).json(veri);
}

// ---- Not ekle (Takip Tablosu > Bu dataları ele al) ----
const NOT_SINIR = 3000;
async function notEkle(req, res, yetki) {
  // Yazma işlemi: izleme modu yok
  if (yetki.tur === "anonim") return res.status(401).json({ error: "Oturum doğrulanamadı. Lütfen çıkış yapıp tekrar giriş yapın." });
  if (yetki.tur === "hata") return res.status(503).json({ error: "Yetki bilgisi okunamadı, biraz sonra tekrar deneyin." });
  if (!["admin", "manager", "staff"].includes(yetki.tur) || !yetki.ad) return res.status(403).json({ error: "Not ekleme yetkiniz yok." });
  const leadId = Number(req.body?.leadId);
  const metin = String(req.body?.metin ?? "").replace(/\r\n?/g, "\n").trim();
  if (!Number.isInteger(leadId) || leadId <= 0) return res.status(400).json({ error: "Data seçilmedi." });
  if (metin.length < 2) return res.status(400).json({ error: "Not boş olamaz." });
  if (metin.length > NOT_SINIR) return res.status(400).json({ error: `Not en fazla ${NOT_SINIR} karakter olabilir.` });

  const d = await kylasAra([kural("id", "equal", leadId)], 0, ["id", "ownerId"]);
  const lead = (d.content || [])[0];
  if (!lead) return res.status(404).json({ error: "Data bulunamadı." });
  if (yetki.tur !== "admin" && !yetki.idler.has(Number(lead.ownerId))) return res.status(403).json({ error: "Bu Data'ya not ekleme yetkiniz yok." });

  const plain = htmlKacir(metin).replace(/\n/g, "<br>");
  // 1) Giriş yapan danışmanın kendi token'ıyla (Kylas'ta onun adına, etiketsiz)
  const akt = await aktorToken(req);
  let n = null, yontem = "etiket";
  if (akt) {
    for (let deneme = 1; deneme <= 2; deneme++) {
      const br = await bearerYaz("https://api.kylas.io/v1/notes/relation", akt.token, "POST", { sourceEntity: { description: plain }, targetEntityId: leadId, targetEntityType: "LEAD" });
      if (br.status === 401 && deneme === 1) { tokenGecersiz(akt.email); const a2 = await aktorToken(req); if (a2) { akt.token = a2.token; continue; } }
      if (br.ok) { n = await br.json().catch(() => ({})); yontem = "kullanici"; }
      break; // başarısızsa (lead görünmüyor vb.) eski yönteme düş
    }
  }
  // 2) Olmazsa eski yöntem: Selman anahtarı + "[Ad · Portal]" etiketi
  if (!n) {
    const aciklama = `[${htmlKacir(yetki.ad)} · Portal] ${plain}`;
    let r;
    for (let deneme = 1; ; deneme++) {
      r = await kylasIstek("https://api.kylas.io/v1/notes/relation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceEntity: { description: aciklama }, targetEntityId: leadId, targetEntityType: "LEAD" }),
      });
      if (r.status === 429 && deneme < 5) { await bekle(1500 * deneme); continue; }
      break;
    }
    if (!r.ok) {
      console.warn(`[not] ${yetki.ad}: data ${leadId} notu yazılamadı (HTTP ${r.status})`);
      return res.status(r.status === 429 ? 503 : 502).json({ error: r.status === 429 ? YOGUN : `Not Kylas'a kaydedilemedi (HTTP ${r.status}).` });
    }
    n = await r.json().catch(() => ({}));
  }
  console.log(`[not] ${yetki.ad} (${yontem}): data ${leadId} not ${n.id ?? "?"}`);
  for (const k of onbellek.keys()) if (k.startsWith("ozet:")) onbellek.delete(k); // not sayıları değişti
  for (const k of notOnbellek.keys()) if (k.startsWith(`notlar:${leadId}:`)) notOnbellek.delete(k);
  aktiviteOnbellek.clear();
  return res.status(200).json({ id: n.id ?? null, tarih: n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString() });
}

// Beklenmeyen hata: Kylas yoğunsa 503 (tarayıcı tekrar dener), diğerleri 502
const hataYaz = (res, err) => res.status(err.message === YOGUN ? 503 : 502).json({ error: err.message });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!oturumKontrol(req, res, "crm-rapor")) return;
  const yetki = await yetkiBul(req);

  if (req.body?.islem === "degerlendirme") {
    try { return await degerlendirme(req, res, yetki); } catch (err) { return hataYaz(res, err); }
  }
  if (req.body?.islem === "takip") {
    try { return await takip(req, res, yetki); } catch (err) { return hataYaz(res, err); }
  }
  if (req.body?.islem === "sonNotlar") {
    try { return await sonNotlar(req, res, yetki); } catch (err) { return hataYaz(res, err); }
  }
  if (req.body?.islem === "ata") {
    try { return await ata(req, res, yetki); } catch (err) { return hataYaz(res, err); }
  }
  if (req.body?.islem === "ozet") {
    try { return await ozet(req, res, yetki); } catch (err) { return hataYaz(res, err); }
  }
  for (const [ad, fn] of [["tasklar", tasklar], ["taskEkle", taskEkle], ["taskTamamla", taskTamamla], ["portalAktivite", portalAktivite]]) {
    if (req.body?.islem === ad) {
      try { return await fn(req, res, yetki); } catch (err) { return hataYaz(res, err); }
    }
  }
  if (req.body?.islem === "detay") {
    try { return await detay(req, res, yetki); } catch (err) { return hataYaz(res, err); }
  }
  if (req.body?.islem === "notEkle") {
    try { return await notEkle(req, res, yetki); } catch (err) { return hataYaz(res, err); }
  }
  if (req.body?.islem === "notlar") {
    try { return await notlar(req, res, yetki); } catch (err) { return hataYaz(res, err); }
  }

  const hamKaynaklar = Array.isArray(req.body?.kaynaklar) ? req.body.kaynaklar : [req.body?.kaynak];
  const kaynaklar = [...new Set(hamKaynaklar.map(Number))].filter(k => Number.isInteger(k) && k > 0).sort((a, b) => a - b);
  const gun = req.body?.gun ? Number(req.body.gun) : null;
  if (!kaynaklar.length || kaynaklar.length !== hamKaynaklar.length) return res.status(400).json({ error: "Geçerli bir veri kaynağı seçin." });
  if (kaynaklar.length > 30) return res.status(400).json({ error: "En fazla 30 kaynak seçilebilir." });
  if (gun !== null && !gecerliGun(gun)) return res.status(400).json({ error: "Geçersiz gün aralığı." });

  const kurallar = [kaynaklar.length === 1 ? kural("source", "equal", kaynaklar[0]) : kural("source", "in", kaynaklar), kural("pipeline", "equal", PIPELINE_ID)];
  if (gun) kurallar.push(tarihKurali(gun));

  if (req.body?.islem === "liste") {
    try { return await liste(req, res, kurallar, yetki); } catch (err) { return hataYaz(res, err); }
  }

  // Zorunlu modda admin olmayan sadece görebildiği danışmanların satırlarını alır
  const suz = veri => {
    if (yetki.tur === "admin" || !zorunluMu()) return veri;
    const danismanlar = Object.fromEntries(Object.entries(veri.danismanlar).filter(([o]) => yetki.idler.has(Number(o))));
    const toplam = Object.values(danismanlar).reduce((a, s) => a + Object.values(s).reduce((x, y) => x + y, 0), 0);
    return { ...veri, danismanlar, toplam };
  };
  if (yetki.tur !== "admin" && !["manager", "staff"].includes(yetki.tur) && !yetkiKontrol(yetki, [], res, "crm-rapor özet")) return;

  const anahtar = `${kaynaklar.join(",")}:${gun || "tumu"}`;
  const kayit = onbellek.get(anahtar);
  if (kayit && Date.now() - kayit.zaman < ONBELLEK_MS) return res.status(200).json(suz(kayit.veri));

  try {
    let leadler = await hepsiniCek(kurallar);
    if (leadler === null) {
      // 10.000'i aşan kaynaklar aşama aşama çekilir
      leadler = [];
      for (const a of ASAMALAR) {
        const parca = await hepsiniCek([...kurallar, kural("pipelineStage", "equal", a.id)]);
        if (parca === null) return res.status(422).json({ error: `"${a.ad}" aşamasında 10.000'den fazla Data var, daha kısa bir tarih aralığı seçin.` });
        leadler.push(...parca);
      }
    }

    const danismanlar = {}; // ownerId -> { stageId: sayı }
    for (const l of leadler) {
      const o = String(l.ownerId ?? "yok");
      const st = String(l.pipelineStage ?? "yok");
      danismanlar[o] = danismanlar[o] || {};
      danismanlar[o][st] = (danismanlar[o][st] || 0) + 1;
    }

    const veri = { kaynaklar, gun, toplam: leadler.length, asamalar: ASAMALAR, danismanlar, guncellendi: new Date().toISOString() };
    onbellek.set(anahtar, { zaman: Date.now(), veri });
    return res.status(200).json(suz(veri));
  } catch (err) {
    return hataYaz(res, err);
  }
}
