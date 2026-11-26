// v1.1: önerilen kapanış (İlgisiz / Olumsuza Dönen + sebep) notların içeriğinden ve temas geçmişinden çıkarılır
// v1.0: Lead notlarından "gereksiz kovalanan / sağlıklı görüşme olmayan" dataları işaretler (sadece okuma, Kylas'a yazmaz).
// Girdi: notlar [{ tarih (ISO), yazan, metin }]. Saatler İstanbul (UTC+3). Kişisel veri çıktıya girmez (lead_id + danışman).

// ---- Eşikler (kolay ayarlansın diye burada) ----
export const ESIK = {
  gorusmeMinKarakter: 60,       // GORUSME sayılması için en az uzunluk
  gorusmeUzunKarakter: 120,     // bu uzunluktaki not anahtar kelime olmadan da GORUSME sayılır
  kovalamaArdisik: 3,           // 1. KOVALAMA: son görüşmeden sonra ardışık başarısız temas
  tercihDisiOran: 0.8,          // 2. TERCIH_SAATI_DINLENMEDI: sonraki aramaların bu oranı aralık dışında
  tercihMinArama: 1,            //    en az bu kadar sonraki arama olmalı
  tekDilimMinArama: 4,          // 3. TEK_SAAT_DILIMI: en az bu kadar arama
  tekDilimOran: 0.8,            //    aramaların bu oranı aynı dilimde
  tekDilimBasariUst: 0.3,       //    başarı oranı bunun altında
  redSonrasiTemas: 2,           // 4. RED_SINYALI_SONRASI_DEVAM: sinyalden sonra en az bu kadar temas
  sagliksizTemas: 6,            // 5. SAGLIKSIZ_ILISKI: toplam temas ≥
  sagliksizGorusmeUst: 1,       //    görüşme ≤
  benzerlik: 0.8,               // 6. KOPYALA_YAPISTIR_TAKIP: metin benzerliği eşiği
  kopyaTekrar: 3,               //    en az bu kadar benzer not
  duzensizBosluk: 90,           // 7. DUZENSIZ_TAKIP: en büyük boşluk (gün) ≥
  duzensizYogun: 14,            //    sonrasında notlar arası ortalama ≤ (gün)
  riskOrta: 2,                  // bayrak sayısı ≥ → Orta
  riskYuksek: 4,                // bayrak sayısı ≥ → Yüksek
};

const IST_MS = 3 * 3600000;
const GUN_MS = 86400000;

export function normal(s) {
  return String(s || "")
    .replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase()
    .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/â/g, "a").replace(/î/g, "i").replace(/û/g, "u")
    .replace(/[’'`]/g, "").replace(/\s+/g, " ").trim();
}

// Sıra önemli: önce daha özel kalıplar
const KALIPLAR = [
  ["REDDETTI", /m[ue]sg[uü]?le ver|reddett|red etti|kapatt[iı]|yuzume kapat|aramay[iı]n|aranmak istemi|ilgilenmiyor|ilgilenmedig|istemiyor|vazgect|engelle/],
  ["WP_CEVAPSIZ", /mesaj(i|im|ima|a|lara|larima)? ?(cevap|donus|yanit) ?(ver|yap)?me|goruldu|gorulmus|gormus ama|okundu|okumus ama|donmedi|donus (yapmadi|olmadi|gelmedi)|yanit (vermedi|gelmedi)|cevap gelmedi/],
  ["ERTELEME", /musait degil|uygun degil|sonra ara|sonra donus|tekrar ara(yin|sin|nmak)|yarin .{0,30}ara|\bsaat\b.{0,20}(arasi|gibi|te|ta|de|da)\b|\d{1,2}[:.]?\d{0,2} ?(-|ile|–) ?\d{1,2}[:.]?\d{0,2} ?(arasi|gibi|saat)|toplanti(da|si var)|iste(yim|dir)|derste|aksam ara|hafta ?sonu ara/],
  ["ULASILAMADI", /cevap ver(me|mi)|cevap vememis|cevapsiz|acmadi|acmiyor|ulasama|ulasilama|ulasilmadi|ulasilamiyor|m[ue]sgul|kapali|erisilem|cagri gitmiyor|hat dusmuyor|telesekreter/],
  ["WP_ATILDI", /\bwp\b|\bwa\b|whats ?app|wapp|watsap|mesaj at|mesaj gonder|mesaj ilet|yazacag|yazdim|yazildi|bilgi gonder|sms/],
];
const BILGI = /\b(yas|yasinda|meslek|calisiyor|ogrenci|universite|lise|sinif|hedef|ulke|ingiltere|londra|amerika|abd|kanada|irlanda|dublin|malta|almanya|avustralya|butce|program|yaz okulu|dil okulu|master|yuksek lisans|lisans|bolum|egitim|kurs|hafta|fiyat|veli|anne|baba|cocug|konustu|gorustu|gorusuldu|gorusme yap|bilgi verdi|bilgilendirdi|planl|tarih|vize|konaklama|aile yani|yurt)/;

export function siniflandir(metin) {
  const n = normal(metin);
  for (const [tur, re] of KALIPLAR) if (re.test(n)) return tur;
  if (n.length >= ESIK.gorusmeUzunKarakter || (n.length >= ESIK.gorusmeMinKarakter && BILGI.test(n))) return "GORUSME";
  return "DIGER";
}

// "14-15 arası", "14:30-16 arası", "saat 14'te", "14 gibi" → { bas, bit } saat (ondalık), gün metni
export function tercihSaati(metin) {
  const n = normal(metin);
  let m = n.match(/(\d{1,2})(?:[:.](\d{2}))? ?(?:-|ile|–|ve) ?(\d{1,2})(?:[:.](\d{2}))?/);
  let bas = null, bit = null;
  if (m) {
    bas = +m[1] + (m[2] ? +m[2] / 60 : 0);
    bit = +m[3] + (m[4] ? +m[4] / 60 : 0);
  } else if ((m = n.match(/saat ?(\d{1,2})(?:[:.](\d{2}))?|(\d{1,2})(?:[:.](\d{2}))? ?(?:gibi|te|ta|de|da)\b/))) {
    const h = +(m[1] || m[3]), dk = +(m[2] || m[4] || 0);
    bas = h + dk / 60; bit = bas + 1;
  }
  if (bas === null || bas < 7 || bas > 23 || bit <= bas || bit > 24) return null;
  const gunler = ["yarin", "pazartesi", "sali", "carsamba", "persembe", "cuma", "cumartesi", "pazar", "hafta ici", "hafta sonu", "sabah", "aksam"];
  const gun = gunler.find(g => n.includes(g)) || "";
  return { bas, bit, gun };
}

const istSaat = iso => { const d = new Date(new Date(iso).getTime() + IST_MS); return d.getUTCHours() + d.getUTCMinutes() / 60; };
export function dilim(saat) { return saat < 12 ? "sabah" : saat < 15 ? "ogle" : saat < 18 ? "ikindi" : "aksam"; }
const DILIM_AD = { sabah: "Sabah (09-12)", ogle: "Öğle (12-15)", ikindi: "İkindi (15-18)", aksam: "Akşam (18+)" };
const saatYazi = h => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;

// Bigram Dice benzerliği
function bigram(s) { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const b = s.slice(i, i + 2); m.set(b, (m.get(b) || 0) + 1); } return m; }
export function benzerlik(a, b) {
  a = normal(a).replace(/[^a-z0-9 ]/g, ""); b = normal(b).replace(/[^a-z0-9 ]/g, "");
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const A = bigram(a), B = bigram(b);
  let ortak = 0;
  for (const [k, v] of A) ortak += Math.min(v, B.get(k) || 0);
  return (2 * ortak) / (a.length - 1 + b.length - 1);
}

const BASARISIZ = new Set(["ULASILAMADI", "REDDETTI", "WP_CEVAPSIZ"]);
const ARAMA = new Set(["ULASILAMADI", "REDDETTI", "ERTELEME", "GORUSME"]); // telefonla yapılmış sayılan temaslar
const NOTR = new Set(["WP_ATILDI", "ERTELEME"]); // ardışık başarısız sayımını bozmaz

export const AKSIYON = {
  KOVALAMA: "Aramayı durdur, nurture'a al",
  RED_SINYALI_SONRASI_DEVAM: "Aramayı durdur, nurture'a al",
  TERCIH_SAATI_DINLENMEDI: "Müşterinin verdiği saatte tek son deneme",
  TEK_SAAT_DILIMI: "Farklı saat diliminde dene",
  KOPYALA_YAPISTIR_TAKIP: "Stratejiyi değiştir: farklı kanal ya da içerikle dön",
  SAGLIKSIZ_ILISKI: "Bir kez farklı yaklaşımla dene, sonuç yoksa kapat",
  DUZENSIZ_TAKIP: "Düzenli ve seyrek takip planı kur",
};
const AKSIYON_SIRA = ["KOVALAMA", "RED_SINYALI_SONRASI_DEVAM", "TERCIH_SAATI_DINLENMEDI", "TEK_SAAT_DILIMI", "KOPYALA_YAPISTIR_TAKIP", "SAGLIKSIZ_ILISKI", "DUZENSIZ_TAKIP"];

// ---- Önerilen kapanış: en yeni nottan geriye doğru ilk eşleşen kalıp; yoksa temas geçmişinden ----
export const ILGISIZ = 217287, OLUMSUZ = 217288;
const KAPANIS_KALIP = [
  [/baska (bir )?(acente|firma|sirket|kurum|danisman)|baska yer(den|le)|baska yerle (anlas|kayit)|kaydini yaptird/, g => (g ? [OLUMSUZ, "Başka Acenteyle Kaydolmuş"] : [ILGISIZ, "Başka Acenteyle Kaydolmuş"])],
  [/yanlis numara|numara yanlis|hatali numara|numara hatali|boyle biri yok|kimseyi tanimiyor|numara (kullanilmiyor|gecersiz|eksik)|abone(ye)? ulasilamiyor|numara mevcut degil/, () => [ILGISIZ, "Hatalı Telefon Numarası"]],
  [/ayni data|mukerrer|zaten kayitli|ikinci kayit|diger kaydi|tekrar eden kayit|cift kayit/, () => [ILGISIZ, "Aynı Data Mevcut"]],
  [/yanlis form|yanlislikla|form doldurmad|formu doldurmamis|haberi yok|basvuru yapmad|ben doldurmadim/, () => [ILGISIZ, "Yanlış Form"]],
  [/sunmuyoruz|hizmet vermiyoruz|programimiz yok|o ulkeye (gonder|hizmet)|destinasyon(umuz)? yok|bizde yok/, () => [ILGISIZ, "Talep Edilen Program / Destinasyon Sunulmuyor"]],
  [/pahali|butce(si)? (yok|yetmi|yetersiz|uygun degil|ayarlayama)|maddi (durum|imkan|sebep)|karsilayama|fiyat(i|lar)? (yuksek|fazla)|ucret(i|ler)? (yuksek|fazla)/, g => (g ? [OLUMSUZ, "Bütçe Ayarlayamadı"] : [ILGISIZ, "Bütçesi Yok"])],
  [/olumsuz profil|yasi (kucuk|buyuk|uygun degil)|yas sinir|profil(i)? uygun degil|ingilizce(si)? yok/, () => [ILGISIZ, "Olumsuz Profil"]],
  [/iptal et|vazgec|plan(lar)?(i|ini)? (degis|iptal)|seneye|gelecek (yil|sene)|bu (yil|sene) degil|gitmeyecek|erteled/, g => (g ? [OLUMSUZ, "Planlarını İptal Etmiş"] : [ILGISIZ, "Artık İlgilenmiyor"])],
];
export function kapanisOnerisi(notlarAsc, gorusmeSayisi) {
  const g = gorusmeSayisi > 0;
  for (let i = notlarAsc.length - 1; i >= 0; i--) {
    const n = normal(notlarAsc[i].metin);
    for (const [re, f] of KAPANIS_KALIP) if (re.test(n)) return f(g);
  }
  const turler = notlarAsc.map(x => x.tur);
  if (turler.includes("REDDETTI")) return [ILGISIZ, "Artık İlgilenmiyor"];
  return g ? [OLUMSUZ, "Ulaşılamıyor"] : [ILGISIZ, "Cevap Vermiyor"];
}

// Tek lead'in analizi. notlar: [{ tarih, yazan, metin }] (sıra önemli değil)
export function leadAnaliz(leadId, sahip, notlar) {
  const n = (notlar || []).filter(x => x && x.tarih)
    .map(x => ({ ...x, zaman: new Date(x.tarih).getTime(), saat: istSaat(x.tarih), tur: siniflandir(x.metin) }))
    .sort((a, b) => a.zaman - b.zaman);
  const temas = n.filter(x => x.tur !== "DIGER");
  const aramalar = temas.filter(x => ARAMA.has(x.tur));
  const gorusmeler = temas.filter(x => x.tur === "GORUSME");
  const basarisiz = temas.filter(x => BASARISIZ.has(x.tur)).length;

  // Son görüşmeden sonra (yoksa baştan) sondan geriye ardışık başarısız
  const sonGorIdx = temas.map(x => x.tur).lastIndexOf("GORUSME");
  let ardisik = 0;
  for (let i = temas.length - 1; i > sonGorIdx; i--) {
    if (BASARISIZ.has(temas[i].tur)) ardisik++;
    else if (NOTR.has(temas[i].tur)) continue;
    else break;
  }

  // Tercih saati: son ERTELEME'deki aralık; sonraki aramalardan kaçı dışında
  let tercih = null, disOran = null, tercihSonrasi = 0;
  for (let i = temas.length - 1; i >= 0; i--) {
    if (temas[i].tur !== "ERTELEME") continue;
    const t = tercihSaati(temas[i].metin);
    if (!t) continue;
    tercih = t;
    const sonra = temas.slice(i + 1).filter(x => ARAMA.has(x.tur));
    tercihSonrasi = sonra.length;
    if (sonra.length) disOran = sonra.filter(x => x.saat < t.bas || x.saat >= t.bit).length / sonra.length;
    break;
  }

  // Saat dilimleri
  const dilimSay = {};
  aramalar.forEach(x => { const d = dilim(x.saat); dilimSay[d] = (dilimSay[d] || 0) + 1; });
  const baskin = Object.entries(dilimSay).sort((a, b) => b[1] - a[1])[0] || null;
  const baskinOran = baskin ? baskin[1] / aramalar.length : 0;
  const ort = aramalar.length ? aramalar.reduce((s, x) => s + x.saat, 0) / aramalar.length : 0;
  const saatSapma = aramalar.length ? Math.sqrt(aramalar.reduce((s, x) => s + (x.saat - ort) ** 2, 0) / aramalar.length) : 0;
  const basariOrani = aramalar.length ? gorusmeler.length / aramalar.length : 0;

  const son2 = temas.slice(-2);
  const sonSinyalRed = son2.some(x => x.tur === "REDDETTI");

  // Red / WP cevapsız sinyalinden sonra (sonraki görüşmeye kadar) temas sayısı, en büyüğü
  let redSonrasi = 0;
  temas.forEach((x, i) => {
    if (x.tur !== "REDDETTI" && x.tur !== "WP_CEVAPSIZ") return;
    let k = 0;
    for (let j = i + 1; j < temas.length && temas[j].tur !== "GORUSME"; j++) k++;
    redSonrasi = Math.max(redSonrasi, k);
  });

  // Günler
  const araliklar = [];
  for (let i = 1; i < n.length; i++) araliklar.push((n[i].zaman - n[i - 1].zaman) / GUN_MS);
  const ilkSon = n.length > 1 ? (n[n.length - 1].zaman - n[0].zaman) / GUN_MS : 0;
  const ortAralik = araliklar.length ? araliklar.reduce((a, b) => a + b, 0) / araliklar.length : 0;
  const enBuyuk = araliklar.length ? Math.max(...araliklar) : 0;
  let duzensiz = false;
  if (enBuyuk >= ESIK.duzensizBosluk) {
    const idx = araliklar.indexOf(enBuyuk);
    const sonraki = araliklar.slice(idx + 1);
    duzensiz = sonraki.length >= 2 && sonraki.reduce((a, b) => a + b, 0) / sonraki.length <= ESIK.duzensizYogun;
  }

  // Tekrar eden kalıp: görüşme dışı notlarda en büyük benzer küme
  const adaylar = temas.filter(x => x.tur !== "GORUSME").map(x => x.metin);
  let tekrar = adaylar.length ? 1 : 0;
  const kullanildi = new Array(adaylar.length).fill(false);
  for (let i = 0; i < adaylar.length; i++) {
    if (kullanildi[i]) continue;
    let k = 1;
    for (let j = i + 1; j < adaylar.length; j++) {
      if (!kullanildi[j] && benzerlik(adaylar[i], adaylar[j]) >= ESIK.benzerlik) { kullanildi[j] = true; k++; }
    }
    tekrar = Math.max(tekrar, k);
  }

  // Bayraklar
  const bayrak = [], gerekce = [];
  if (ardisik >= ESIK.kovalamaArdisik) { bayrak.push("KOVALAMA"); gerekce.push(`${gorusmeler.length ? "son görüşmeden sonra" : "hiç görüşme olmadan"} ${ardisik} ardışık başarısız temas`); }
  if (tercih && tercihSonrasi >= ESIK.tercihMinArama && disOran >= ESIK.tercihDisiOran) { bayrak.push("TERCIH_SAATI_DINLENMEDI"); gerekce.push(`müşteri ${saatYazi(tercih.bas)}-${saatYazi(tercih.bit)} dedi, sonraki aramaların %${Math.round(disOran * 100)}'i dışında`); }
  if (aramalar.length >= ESIK.tekDilimMinArama && baskinOran >= ESIK.tekDilimOran && basariOrani < ESIK.tekDilimBasariUst) { bayrak.push("TEK_SAAT_DILIMI"); gerekce.push(`aramaların %${Math.round(baskinOran * 100)}'i ${DILIM_AD[baskin[0]].toLowerCase()} diliminde`); }
  if (redSonrasi >= ESIK.redSonrasiTemas) { bayrak.push("RED_SINYALI_SONRASI_DEVAM"); gerekce.push(`red/cevapsız sinyalinden sonra ${redSonrasi} temas daha`); }
  if (temas.length >= ESIK.sagliksizTemas && gorusmeler.length <= ESIK.sagliksizGorusmeUst) { bayrak.push("SAGLIKSIZ_ILISKI"); gerekce.push(`${temas.length} temasta ${gorusmeler.length} görüşme`); }
  if (tekrar >= ESIK.kopyaTekrar) { bayrak.push("KOPYALA_YAPISTIR_TAKIP"); gerekce.push(`aynı not ${tekrar} kez tekrarlanmış`); }
  if (duzensiz) { bayrak.push("DUZENSIZ_TAKIP"); gerekce.push(`${Math.round(enBuyuk)} günlük boşluktan sonra yoğun arama`); }

  const risk = bayrak.length >= ESIK.riskYuksek ? "Yüksek" : bayrak.length >= ESIK.riskOrta ? "Orta" : "Düşük";
  const aksiyonBayrak = AKSIYON_SIRA.find(b => bayrak.includes(b));
  const kisaGerekce = gerekce.length ? (gerekce.slice(0, 2).join("; ") + (gerekce.length > 2 ? ` (+${gerekce.length - 2})` : "")).replace(/^./, c => c.toUpperCase()) + "." : "";

  const [kapanisAsama, kapanisSebep] = kapanisOnerisi(n, gorusmeler.length);
  return {
    lead_id: leadId,
    sahip: sahip || "",
    not_sayisi: n.length,
    toplam_temas: temas.length,
    basarisiz_temas: basarisiz,
    gorusme_sayisi: gorusmeler.length,
    son_gorusme_tarihi: gorusmeler.length ? new Date(gorusmeler[gorusmeler.length - 1].zaman + IST_MS).toISOString().slice(0, 10) : "",
    ardisik_basarisiz: ardisik,
    tercih_saati: tercih ? `${saatYazi(tercih.bas)}-${saatYazi(tercih.bit)}${tercih.gun ? ` (${tercih.gun})` : ""}` : "",
    aralik_disi_arama_orani: disOran === null ? "" : Math.round(disOran * 100) / 100,
    baskin_saat_dilimi: baskin ? DILIM_AD[baskin[0]] : "",
    baskin_dilim_orani: Math.round(baskinOran * 100) / 100,
    farkli_dilim_sayisi: Object.keys(dilimSay).length,
    saat_std: Math.round(saatSapma * 100) / 100,
    son_sinyal_red: sonSinyalRed,
    ilk_son_not_arasi_gun: Math.round(ilkSon),
    ort_not_araligi_gun: Math.round(ortAralik * 10) / 10,
    en_buyuk_bosluk_gun: Math.round(enBuyuk),
    tekrar_eden_kalip: tekrar,
    bayraklar: bayrak,
    risk_skoru: risk,
    kisa_gerekce: kisaGerekce,
    onerilen_aksiyon: aksiyonBayrak ? AKSIYON[aksiyonBayrak] : "",
    onerilen_kapanis: `${kapanisAsama === ILGISIZ ? "İlgisiz" : "Olumsuza Dönen"} · ${kapanisSebep}`,
    kapanis: { asama: kapanisAsama, sebep: kapanisSebep },
    turler: n.map(x => x.tur),
  };
}

export function danismanOzeti(sonuclar) {
  const g = {};
  for (const s of sonuclar) {
    const d = (g[s.sahip] ||= { danisman: s.sahip, lead: 0, bayrakli: 0, yuksek: 0, bayrakSay: {}, dilimSay: {} });
    d.lead++;
    if (s.bayraklar.length) d.bayrakli++;
    if (s.risk_skoru === "Yüksek") d.yuksek++;
    s.bayraklar.forEach(b => { d.bayrakSay[b] = (d.bayrakSay[b] || 0) + 1; });
    if (s.baskin_saat_dilimi) d.dilimSay[s.baskin_saat_dilimi] = (d.dilimSay[s.baskin_saat_dilimi] || 0) + 1;
  }
  return Object.values(g).map(d => ({
    danisman: d.danisman, lead: d.lead, bayrakli: d.bayrakli, yuksek: d.yuksek,
    en_sik_bayrak: Object.entries(d.bayrakSay).sort((a, b) => b[1] - a[1])[0]?.[0] || "",
    baskin_saat: Object.entries(d.dilimSay).sort((a, b) => b[1] - a[1])[0]?.[0] || "",
  })).sort((a, b) => b.bayrakli - a.bayrakli || b.lead - a.lead);
}

export const CSV_SUTUNLAR = ["lead_id", "sahip", "toplam_temas", "gorusme_sayisi", "son_gorusme_tarihi", "ardisik_basarisiz", "tercih_saati", "aralik_disi_arama_orani", "baskin_saat_dilimi", "bayraklar", "risk_skoru", "kisa_gerekce", "onerilen_aksiyon", "onerilen_kapanis"];
export function csvYap(sonuclar) {
  const kac = v => { const s = Array.isArray(v) ? v.join("|") : String(v ?? ""); return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return "﻿" + [CSV_SUTUNLAR.join(","), ...sonuclar.map(s => CSV_SUTUNLAR.map(k => kac(s[k])).join(","))].join("\n");
}

// Örnek test vakası: 8 not, tek görüşme, "14-15 arası arayın", aramalar 15:30-18:00, son not "meşgule verdi"
export function ornekVaka() {
  const t = (gun, saat) => { const [h, m] = saat.split(":").map(Number); return new Date(Date.UTC(2026, 9, gun, h - 3, m)).toISOString(); };
  const notlar = [
    { tarih: t(1, "11:10"), metin: "Veli ile görüştüm. Kızı 10. sınıf, 15 yaşında. İngiltere yaz okulu düşünüyorlar, bütçe 5000 sterlin civarı, 3 haftalık program istiyorlar." },
    { tarih: t(3, "16:05"), metin: "Müsait değilim, 14-15 arası arayın dedi." },
    { tarih: t(4, "15:40"), metin: "Aradım cevap vermedi, wp'tan yazacağım." },
    { tarih: t(6, "16:30"), metin: "Aradım cevap vermedi, wpdan yazacağım." },
    { tarih: t(8, "17:15"), metin: "aradım cevap vermedi wp'tan yazacagım" },
    { tarih: t(10, "15:50"), metin: "Aradım, cevap vermedi. Wp'tan yazacağım." },
    { tarih: t(13, "17:55"), metin: "Aradım cevap vermedi wp tan yazacağım." },
    { tarih: t(15, "16:45"), metin: "Meşgule verdi." },
  ];
  const s = leadAnaliz(0, "Örnek", notlar);
  const beklenen = ["KOVALAMA", "TERCIH_SAATI_DINLENMEDI", "TEK_SAAT_DILIMI", "SAGLIKSIZ_ILISKI", "KOPYALA_YAPISTIR_TAKIP"];
  const eksik = beklenen.filter(b => !s.bayraklar.includes(b));
  return { gecti: !eksik.length && s.risk_skoru === "Yüksek", eksik, sonuc: s };
}
