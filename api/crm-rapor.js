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
import { oturumKontrol } from "./_oturum.js";
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
async function kylasAra(kurallar, page, alanlar = ["id", "ownerId", "pipelineStage"], sirala = "id,asc", boyut = SAYFA) {
  for (let deneme = 1; ; deneme++) {
    const r = await fetch(`https://api.kylas.io/v1/search/lead?page=${page}&size=${boyut}&sort=${sirala}`, {
      method: "POST",
      headers: { "api-key": process.env.KYLAS_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: alanlar, jsonRule: { condition: "AND", valid: true, rules: kurallar } }),
    });
    if (r.status === 429 && deneme < 5) {
      const sn = Number(r.headers?.get?.("retry-after"));
      await bekle(Number.isFinite(sn) && sn > 0 ? Math.min(sn, 10) * 1000 : 1200 * deneme);
      continue;
    }
    if (r.status === 429) throw new Error("Kylas şu an çok yoğun, birkaç saniye sonra tekrar deneyin.");
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

// Kylas GET isteği: 429 (hız sınırı) gelirse bekleyip tekrar dener
async function kylasGet(url) {
  for (let deneme = 1; ; deneme++) {
    const r = await fetch(url, { headers: { "api-key": process.env.KYLAS_API_KEY, Accept: "application/json" } });
    if (r.status === 429 && deneme < 5) {
      const sn = Number(r.headers?.get?.("retry-after"));
      await bekle(Number.isFinite(sn) && sn > 0 ? Math.min(sn, 10) * 1000 : 1200 * deneme);
      continue;
    }
    return r;
  }
}

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
      notlar[l.id] = n ? { tarih: new Date(n.createdAt).toISOString(), yazan: isimler[n.createdBy] || "", toplam: d.totalElements || 1 } : null;
    }));
  }
  return res.status(200).json({ notlar });
}

async function notlar(req, res, yetki) {
  const leadId = Number(req.body?.leadId);
  let ownerId = Number(req.body?.ownerId);
  if (!Number.isInteger(leadId) || !Number.isInteger(ownerId)) return res.status(400).json({ error: "leadId ve ownerId gerekli." });
  // Admin değilse istekteki ownerId'ye güvenilmez, lead'in gerçek sahibi Kylas'tan okunur
  if (yetki.tur !== "admin") {
    const d = await kylasAra([kural("id", "equal", leadId)], 0, ["id", "ownerId"]);
    const lead = (d.content || [])[0];
    if (!lead) return res.status(404).json({ error: "Data bulunamadı." });
    ownerId = Number(lead.ownerId);
    if (!yetkiKontrol(yetki, [ownerId], res, "crm-rapor notlar")) return;
  }
  // targetEntityOwnerId olmadan Kylas 400 döner
  const r = await fetch(`https://api.kylas.io/v1/notes/relation?targetEntityId=${leadId}&targetEntityType=LEAD&targetEntityOwnerId=${ownerId}&sort=createdAt,desc&page=0&size=3`, {
    headers: { "api-key": process.env.KYLAS_API_KEY, Accept: "application/json" },
  });
  if (!r.ok) return res.status(502).json({ error: `Notlar alınamadı (HTTP ${r.status})` });
  const d = await r.json();
  const isimler = d.metaData?.idNameStore?.createdBy || {};
  return res.status(200).json({
    toplam: d.totalElements || 0,
    notlar: (d.content || []).map(n => ({ tarih: new Date(n.createdAt).toISOString(), yazan: isimler[n.createdBy] || "", metin: metneCevir(n.description) })),
  });
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
  const r = await fetch("https://api.kylas.io/v1/users?page=0&size=200", { headers: { "api-key": process.env.KYLAS_API_KEY, Accept: "application/json" } });
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
  if (!yetkiKontrol(yetki, ownerIds, res, "crm-rapor takip")) return;

  const kurallar = [sahipKurali(ownerIds), kural("pipeline", "equal", PIPELINE_ID), kural("pipelineStage", "in", TAKIP_ASAMALARI)];
  if (kaynaklar.length) kurallar.push(kural("source", "in", kaynaklar));
  const leadler = await hepsiniCek(kurallar, [...LISTE_ALANLARI, "source"]);
  if (leadler === null) return res.status(422).json({ error: "Seçimde 10.000'den fazla açık Data var, daha az danışman ya da kaynak seçin." });

  const simdi = Date.now();
  const sinir = simdi - sessizGun * 24 * 60 * 60 * 1000;
  const bosOzet = () => ({ toplam: 0, taskBeklenen: 0, ileriTask: 0, gecikmisTask: 0, taskYok: 0, takipsiz: 0 });
  const ozet = bosOzet();
  const danismanlar = Object.fromEntries(ownerIds.map(id => [id, bosOzet()]));
  const takipsiz = [];
  const gecikmis = [];
  const satir = l => ({
    id: l.id, ad: [l.firstName, l.lastName].filter(Boolean).join(" "), ownerId: l.ownerId, asama: l.pipelineStage, kaynak: l.source,
    olusturma: l.createdAt || null, sonAktivite: l.latestActivityCreatedAt || null, sonrakiTask: l.taskDueOn || null,
  });
  for (const l of leadler) {
    const d = danismanlar[l.ownerId] || (danismanlar[l.ownerId] = bosOzet());
    const say = alan => { ozet[alan]++; d[alan]++; };
    say("toplam");
    const t = takipDurumu(l, simdi, sinir);
    if (t.zorunlu) {
      say("taskBeklenen");
      if (t.taskTur === "ileri") say("ileriTask");
      else if (t.taskTur === "gecikmis") { say("gecikmisTask"); gecikmis.push(satir(l)); }
      else say("taskYok");
    }
    if (t.takipsiz) {
      say("takipsiz");
      takipsiz.push({ ...satir(l), zorunlu: t.zorunlu });
    }
  }
  takipsiz.sort((a, b) => (zaman(a.sonAktivite) || 0) - (zaman(b.sonAktivite) || 0));
  gecikmis.sort((a, b) => zaman(a.sonrakiTask) - zaman(b.sonrakiTask));
  return res.status(200).json({ ozet, danismanlar, sessizGun, kaynaklar, takipsiz, gecikmis, guncellendi: new Date().toISOString() });
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
const OZET_MAX_GUN = 90;
const OZET_LISTE_SINIR = 300;
const TASK_TAMAM = 2614528;
const tarihSonrasi = (alan, iso) => kural(alan, "greater", iso, "date");

// Dönemde güncellenen tüm task'lar (updatedAt'e göre yeniden eskiye, dönem dışına çıkınca durur)
async function donemTasklari(basMs) {
  const sonuc = [];
  for (let page = 0; page < 20; page++) {
    const r = await kylasGet(`https://api.kylas.io/v1/tasks?page=${page}&size=1000&sort=updatedAt,desc`);
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
async function donemNotlari(ownerId, bas) {
  const sonuc = [];
  for (let page = 0; page < 10; page++) {
    for (let deneme = 1; ; deneme++) {
      const r = await fetch(`https://api.kylas.io/v1/notes/search?page=${page}&size=1000&sort=createdAt,desc`, {
        method: "POST",
        headers: { "api-key": process.env.KYLAS_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ jsonRule: { condition: "AND", valid: true, rules: [kural("createdBy", "equal", ownerId), tarihSonrasi("createdAt", bas)] } }),
      });
      if (r.status === 429 && deneme < 5) { await bekle(1200 * deneme); continue; }
      if (!r.ok) throw new Error(`Notlar alınamadı (HTTP ${r.status})`);
      const d = await r.json();
      (d.content || []).forEach(n => sonuc.push((n.relations || []).find(x => x.entityType === "LEAD")?.entityId ?? null));
      if (page + 1 >= (d.totalPages || 0)) return sonuc;
      break;
    }
  }
  return sonuc;
}

async function ozet(req, res, yetki) {
  const ownerId = Number(req.body?.ownerId);
  const gun = Number(req.body?.gun);
  if (!Number.isInteger(ownerId)) return res.status(400).json({ error: "Danışman seçilmedi." });
  if (!Number.isInteger(gun) || gun < 1 || gun > OZET_MAX_GUN) return res.status(400).json({ error: `Gün 1 ile ${OZET_MAX_GUN} arasında olmalı.` });
  if (!yetkiKontrol(yetki, [ownerId], res, "crm-rapor ozet")) return;

  const anahtar = `ozet:${ownerId}:${gun}`;
  const eski = onbellek.get(anahtar);
  if (eski && Date.now() - eski.zaman < 2 * 60 * 1000) return res.status(200).json(eski.veri);

  const bas = new Date(Date.now() - gun * GUN_MS).toISOString();
  const basMs = zaman(bas);
  const [yeniler, notLeadleri, tasklar] = await Promise.all([
    hepsiniCek([kural("ownerId", "equal", ownerId), kural("pipeline", "equal", PIPELINE_ID), tarihSonrasi("createdAt", bas)], [...LISTE_ALANLARI, "source"]),
    donemNotlari(ownerId, bas),
    donemTasklari(basMs),
  ]);
  if (yeniler === null) return res.status(422).json({ error: "Dönem çok kalabalık, daha kısa bir süre seçin." });

  const yeniIdler = new Set(yeniler.map(l => l.id));
  const taskliLead = new Set();
  let acilan = 0, tamamlanan = 0;
  for (const t of tasklar) {
    const lead = taskLead(t);
    if (lead && yeniIdler.has(lead)) taskliLead.add(lead);
    if (t.createdBy === ownerId && zaman(t.createdAt) >= basMs) acilan++;
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
      r = await fetch(`https://api.kylas.io/v1/leads/${id}`, {
        method: "PATCH",
        headers: { "api-key": process.env.KYLAS_API_KEY, "Content-Type": "application/json-patch+json", Accept: "application/json" },
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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!oturumKontrol(req, res, "crm-rapor")) return;
  const yetki = await yetkiBul(req);

  if (req.body?.islem === "degerlendirme") {
    try { return await degerlendirme(req, res, yetki); } catch (err) { return res.status(502).json({ error: err.message }); }
  }
  if (req.body?.islem === "takip") {
    try { return await takip(req, res, yetki); } catch (err) { return res.status(502).json({ error: err.message }); }
  }
  if (req.body?.islem === "sonNotlar") {
    try { return await sonNotlar(req, res, yetki); } catch (err) { return res.status(502).json({ error: err.message }); }
  }
  if (req.body?.islem === "ata") {
    try { return await ata(req, res, yetki); } catch (err) { return res.status(502).json({ error: err.message }); }
  }
  if (req.body?.islem === "ozet") {
    try { return await ozet(req, res, yetki); } catch (err) { return res.status(502).json({ error: err.message }); }
  }
  if (req.body?.islem === "notlar") {
    try { return await notlar(req, res, yetki); } catch (err) { return res.status(502).json({ error: err.message }); }
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
    try { return await liste(req, res, kurallar, yetki); } catch (err) { return res.status(502).json({ error: err.message }); }
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
    return res.status(502).json({ error: err.message });
  }
}
