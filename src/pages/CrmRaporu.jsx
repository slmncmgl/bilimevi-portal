// v3.4: apiCagir: Kylas yoğunken (503) okuma istekleri 2 ve 4 sn sonra tekrar denenir
// v3.3: VIP Datalar OFF VIP kaynakları seçimden çıkarır (FiltreCubugu v1.5)
// v3.2: Danışman Ata çubuğu ortak bileşende (DanismanAta.jsx), Takip Tablosu da kullanır
// v3.1: açılışta tüm veri kaynakları seçili; VIP Datalar ON/OFF anahtar (OFF: tüm kaynaklar)
// v3.0: Danışman Ata onayı portal renklerinde pencerede (OnayPenceresi.jsx), tarayıcının onay kutusu kalktı
// v2.9: giriş çubuğu ortak (FiltreCubugu.jsx): Danışman (çoklu, boşsa tümü) · kaynak + VIP · Data tarihi. Şube düğmeleri kalktı
// v2.8: tıklanan hücrenin listesinde sayfalama (sayfa başına 10 / 20 / 30 / 50); başlıktaki kutucuk o sayfadaki Dataları seçer
// v2.7: listede kutucuk sütunu + "Danışman Ata": seçilen Datalar başka satış danışmanına aktarılır (admin herkese, manager kendi şubesinde)
// v2.6: filtre başlıkları kalktı; filtreler renkli çerçeve içinde (Cerceve: kaynak turuncu, tarih mor, şube lacivert)
// v2.5: filtre başlıkları renkli (Veri kaynağı, Data tarihi, Şube; BASLIK_RENK / etiket ortak)
// v2.4: tıklanan hücrenin data listesinde "Kaynak" sütunu (VIP kaynaklarda VIP etiketi)
// v2.3: satış ekibi src/lib/satisEkibi.js'te: Furkan Atalı eklendi (İzmir), şube listeden gelir, ID sekmesinde olmayanlar (Özgür Koç) listedeki Kylas ID ile eşlenir
// v2.2: açıklamalar üzerine gelince balonda (Ipucu.jsx): Veri kaynağı, Data tarihi, Danışman sütunu, Diğer satırı
// v2.1: Data tarihi açılışta "Tümü"
// v2.0: "Data oluşturma tarihi" -> "Data tarihi": Tümü + açılır liste (Son 7 / 14 / 30 / N gün, TarihSecici.jsx)
// v1.9: ekrandaki "lead" yazıları "Data" oldu (Lead ID -> Data ID vb.)
// v1.8: ekran açılınca VIP Datalar seçili gelir (danışmanlar zaten hepsi görünür); tablo başlığı menüdeki özetle aynı (★ VIP Datalar gibi)
// v1.7: menüdeki VIP Datalar hızlı seçimine Setrow Marketing eklendi
// v1.6: veri kaynağı açılır çoklu seçim menüsünde (KaynakSecici.jsx); tarih ve şube aynı satırda.
// v1.5: kaynak düğmeleri eşit genişlikte ızgarada; Tümü / Temizle başlık satırının sağında. Sürüm etiketi için CRM_SURUM.
// v1.4: birden fazla veri kaynağı seçilebilir (✓ ile işaretlenir, "Tümü" hepsini seçer, "Temizle" boşaltır).
//       Seçim değişince istek 400 ms bekleyip gider, art arda tıklamalar tek istek olur.
// v1.3: satış ekibi listesi (SATIS_EKIBI). Tabloda sadece satış danışmanları ayrı satır, diğer sahipler "Diğer" satırında.
//       Staff her durumda kendi satırını görür. Sunucu da artık rolü kontrol ediyor (api/_yetki.js).
// v1.2: kişi yükleme, NotBalonu ve yardımcılar TakipRaporu.jsx için dışa açıldı (davranış aynı)
// v1.1: grid görünüm; sayılar tıklanabilir, tıklanınca o danışman + aşama için lead listesi (LeadPaneli) açılır.
//       Lead ID Kylas'ta yeni sekmede açılır, not ikonunun üzerine gelince son 3 not görünür (NotBalonu).
// v1.0: Performans Analizi > CRM Raporu sekmesi
// Veri kaynağı seçilir, o kaynaktaki Bilimevi pipeline lead'leri danışman x aşama tablosunda sayılır.
// Sayılar /api/crm-rapor'dan gelir. Danışman adı ve şubesi İzin Yönetimi'ndeki ID (e-posta -> Kylas ID)
// ve Personel sekmelerinden eşlenir; ID sekmesinde olmayan sahipler "Diğer" satırında toplanır.
// Rol kuralı Quiz Skorları ile aynı: admin/director/owner herkesi, manager kendi şubesini, staff kendini görür.
import { useState, useEffect, useRef } from "react";
import { VIP_KAYNAKLAR, kaynakOzeti } from "./KaynakSecici";
import FiltreCubugu from "./FiltreCubugu";
import DanismanAta from "./DanismanAta";
import Ipucu from "./Ipucu";
import { SATIS_EKIBI, satisBul } from "../lib/satisEkibi";

const SHEET_ID = "1jS9yt_wIrL-JXbstqtrG9nML0nalRmOkSarpIbOLCxA";
const csvUrl = sekme => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sekme)}`;

// Kylas "Kaynak" picklist ID'leri, lead sayısına göre sıralı (Kasım 2026)
export const KAYNAKLAR = [
  { id: 2675584, ad: "Instagram" },
  { id: 2650987, ad: "Fuar" },
  { id: 2753894, ad: "Imports" },
  { id: 2650986, ad: "Bilgi İstek Formu" },
  { id: 2614512, ad: "Referans" },
  { id: 2614515, ad: "Instagram DM" },
  { id: 2674021, ad: "Facebook" },
  { id: 3024131, ad: "Setrow Marketing" },
  { id: 2614513, ad: "Telefon" },
  { id: 2614514, ad: "Ofis" },
  { id: 2652456, ad: "Google" },
  { id: 3017966, ad: "Event" },
  { id: 2941507, ad: "Websitesi" },
  { id: 3005340, ad: "Eski Öğrenci" },
];

export const CRM_SURUM = "v3.4"; // 1. satırdaki sürümle aynı tut (sayfanın altındaki etikette görünür)

export const TUM_KAYNAKLAR = KAYNAKLAR.map(k => k.id);
// Hepsi seçiliyse kaynak filtresi gönderilmez (kaynağı boş datalar da sayılır)
export const kaynakFiltresi = secili => (secili.length === KAYNAKLAR.length ? [] : secili);

export const KYLAS_LEAD_URL = id => `https://app.kylas.io/sales/leads/details/${id}`;

// Kylas yoğunsa (sunucu 503 döner) okuma istekleri 2 ve 4 sn sonra kendiliğinden tekrar denenir.
// Yazma istekleri (not, task, atama) tekrarlanmaz: sunucu zaten kendi içinde tekrar dener, çift kayıt olmasın.
const YAZMA_ISLEMLERI = ["notEkle", "taskEkle", "taskTamamla", "ata"];
export async function apiCagir(govde) {
  const okuma = !YAZMA_ISLEMLERI.includes(govde?.islem);
  for (let deneme = 1; ; deneme++) {
    const r = await fetch("/api/crm-rapor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(govde) });
    const d = await r.json().catch(() => ({}));
    if ((r.status === 503 || r.status === 429) && okuma && deneme < 3) { await new Promise(c => setTimeout(c, 2000 * deneme)); continue; }
    if (!r.ok) throw new Error(d.error || `İstek başarısız (HTTP ${r.status})`);
    return d;
  }
}

export function tarih(v, saatli = false) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", ...(saatli ? { hour: "2-digit", minute: "2-digit" } : {}) });
}

function parseCSV(csv) {
  return csv.trim().split("\n").map(line => {
    const values = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) { values.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    values.push(cur.trim());
    return values;
  });
}

function satirlariOku(csv) {
  const rows = parseCSV(csv);
  const h = rows[0] || [];
  return rows.slice(1).map(r => Object.fromEntries(h.map((k, i) => [k, r[i] || ""])));
}

export const kucuk = v => String(v || "").trim().toLocaleLowerCase("tr-TR");

// Satış danışmanları (Kasım 2026, Selman'ın listesi). Ad Soyad Personel sekmesiyle eşleşmeli.
// Ekip değişince bu listeyi güncelleyin.
// Satış danışmanları ve raporlarda görünecek şubeleri: src/lib/satisEkibi.js
export { SATIS_EKIBI } from "../lib/satisEkibi";

// Kylas ID -> { ad, sube, email }: İzin Yönetimi ID sekmesi (e-posta -> Kylas ID) + Personel sekmesi
export async function kisileriYukle() {
  const [idCsv, personelCsv] = await Promise.all([fetch(csvUrl("ID")).then(r => r.text()), fetch(csvUrl("Personel")).then(r => r.text())]);
  const personel = satirlariOku(personelCsv);
  const harita = {};
  satirlariOku(idCsv).forEach(r => {
    const email = kucuk(r.Email);
    const id = String(r.ID || "").trim();
    if (!email || !id) return;
    const p = personel.find(x => kucuk(x["E-posta"]) === email);
    const s = p ? satisBul(p["Ad Soyad"]) : null;
    harita[id] = { ad: p?.["Ad Soyad"] || email.split("@")[0], sube: s?.sube || p?.["Şube"] || "", email, personelde: !!p, satis: !!s };
  });
  // ID sekmesinde satırı olmayan satış danışmanları listedeki Kylas ID ile eklenir
  SATIS_EKIBI.filter(s => s.kylasId && !harita[String(s.kylasId)]).forEach(s => {
    const p = personel.find(x => kucuk(x["Ad Soyad"]) === kucuk(s.ad));
    if (p) harita[String(s.kylasId)] = { ad: p["Ad Soyad"], sube: s.sube, email: kucuk(p["E-posta"]), personelde: true, satis: true };
  });
  return harita;
}

export default function CrmRaporu({ user, isAdmin, isManager }) {
  const [kisiler, setKisiler] = useState(null); // kylasId -> { ad, sube, email }
  const [kisiHata, setKisiHata] = useState(null);
  const [kaynaklar, setKaynaklar] = useState(TUM_KAYNAKLAR); // seçili kaynak id'leri, açılışta tüm kaynaklar
  const [gun, setGun] = useState(null); // null = Tümü, açılışta Tümü
  const [danismanSecim, setDanismanSecim] = useState([]); // boşsa tüm danışmanlar (Diğer dahil)
  const [rapor, setRapor] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState(null);
  const [secim, setSecim] = useState(null); // { baslik, ownerIds, asama, asamaAd }
  const [yenile, setYenile] = useState(0); // Danışman Ata sonrası sayıları yeniden çeker
  const sessiz = useRef(false); // true ise yenilemede tablo yerine spinner gösterilmez

  const kaynakAnahtari = [...kaynaklar].sort((a, b) => a - b).join(",");
  const kaynakAdlari = kaynakOzeti(KAYNAKLAR, kaynaklar, "");

  useEffect(() => {
    kisileriYukle()
      .then(setKisiler)
      .catch(() => setKisiHata("Danışman listesi okunamadı."));
  }, []);

  useEffect(() => { setSecim(null); }, [kaynakAnahtari, gun]);

  useEffect(() => {
    if (!kaynaklar.length) { setRapor(null); return; }
    let iptal = false;
    if (!sessiz.current) setYukleniyor(true);
    sessiz.current = false;
    setHata(null);
    const zamanlayici = setTimeout(() => {
      apiCagir({ kaynaklar, gun })
        .then(d => { if (!iptal) setRapor(d); })
        .catch(e => { if (!iptal) { setRapor(null); setHata(e.message); } })
        .finally(() => { if (!iptal) setYukleniyor(false); });
    }, 400);
    return () => { iptal = true; clearTimeout(zamanlayici); };
  }, [kaynakAnahtari, gun, yenile]);

  // Satırları kur: tanınan danışmanlar ayrı, diğer sahipler tek "Diğer" satırında
  const satirlar = [];
  const kendiEmail = kucuk(user?.email);
  const kendisiMi = k => k.email === kendiEmail || kucuk(k.ad) === kucuk(user?.name);
  if (rapor && kisiler) {
    const diger = { ad: "Diğer", sube: "", sayilar: {}, diger: true, ownerIds: [] };
    Object.entries(rapor.danismanlar).forEach(([ownerId, sayilar]) => {
      const k = kisiler[ownerId];
      if (k && (k.satis || kendisiMi(k))) { satirlar.push({ ...k, sayilar, ownerIds: [Number(ownerId)] }); return; }
      if (Number.isInteger(Number(ownerId))) diger.ownerIds.push(Number(ownerId));
      Object.entries(sayilar).forEach(([st, n]) => { diger.sayilar[st] = (diger.sayilar[st] || 0) + n; });
    });
    if (Object.keys(diger.sayilar).length) satirlar.push(diger);
  }

  // Seçicideki danışmanlar ve Danışman Ata hedefleri: admin tüm satış ekibi, manager kendi şubesi; staff'ta ikisi de yok
  const danismanListesi = !kisiler || !(isAdmin || isManager) ? null : Object.entries(kisiler)
    .map(([id, k]) => ({ id: Number(id), ...k }))
    .filter(k => k.satis && k.personelde && (isAdmin || kucuk(k.sube) === kucuk(user?.branch)))
    .sort((a, b) => (a.sube || "").localeCompare(b.sube || "", "tr") || a.ad.localeCompare(b.ad, "tr"));
  const atamaHedefleri = danismanListesi;

  const gorunen = satirlar
    .filter(r => {
      const secildi = !danismanSecim.length || (!r.diger && danismanSecim.includes(r.ownerIds[0]));
      if (isAdmin) return secildi;
      if (isManager) return !r.diger && kucuk(r.sube) === kucuk(user?.branch) && secildi;
      return !r.diger && kendisiMi(r);
    })
    .map(r => ({ ...r, toplam: Object.values(r.sayilar).reduce((a, b) => a + b, 0) }))
    .sort((a, b) => (a.diger ? 1 : b.diger ? -1 : b.toplam - a.toplam));

  const asamalar = rapor?.asamalar || [];
  const sutunToplam = id => gorunen.reduce((a, r) => a + (r.sayilar[id] || 0), 0);
  const genelToplam = gorunen.reduce((a, r) => a + r.toplam, 0);

  function hucreSec(r, asama) {
    if (!r.ownerIds.length) return;
    setSecim({ anahtar: `${r.ad}:${asama?.id || "tumu"}`, baslik: r.ad, ownerIds: r.ownerIds, asama: asama?.id || null, asamaAd: asama?.ad || "Tüm aşamalar" });
  }
  const seciliMi = (r, asama) => secim?.anahtar === `${r.ad}:${asama?.id || "tumu"}`;
  const sayiHucresi = (r, asama, n, ekStil = {}) => (
    n ? (
      <button onClick={() => hucreSec(r, asama)}
        style={{ ...c.sayiBtn, ...ekStil, ...(seciliMi(r, asama) ? c.sayiBtnSecili : {}) }}>
        {n.toLocaleString("tr-TR")}
      </button>
    ) : <span style={{ color: "#cbd5e1" }}>·</span>
  );

  return (
    <>
      <FiltreCubugu
        danisman={danismanListesi ? { liste: danismanListesi, secili: danismanSecim, onChange: setDanismanSecim, bosMetin: "Tüm danışmanlar" } : null}
        kaynak={{ secili: kaynaklar, onChange: setKaynaklar, bosMetin: "Kaynak seçin" }}
        tarih={{ deger: gun, onChange: setGun, bosMetin: "Data tarihi", ipucu: "Data tarihi: datanın Kylas'ta oluşturulduğu tarih. Tümü: tüm zamanlar." }} />

      {kisiHata && <div style={c.hata}>{kisiHata}</div>}
      {!kaynaklar.length && <div style={c.bos}>Raporu görmek için bir ya da birden fazla veri kaynağı seçin.</div>}
      {kaynaklar.length > 0 && yukleniyor && (
        <div style={c.bos}><span style={c.spinner} /> Kylas'tan sayılar alınıyor...</div>
      )}
      {kaynaklar.length > 0 && !yukleniyor && hata && <div style={c.hata}>{hata}</div>}

      {kaynaklar.length > 0 && !yukleniyor && !hata && rapor && kisiler && (
        gorunen.length === 0 ? (
          <div style={c.bos}>Bu kaynakta size ait Data bulunmuyor.</div>
        ) : (
          <div style={c.tablo}>
            <div style={c.tabloBaslik}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                {kaynakAdlari} · Bilimevi pipeline
              </span>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                {genelToplam.toLocaleString("tr-TR")} Data · {new Date(rapor.guncellendi).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} itibarıyla
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={c.grid}>
                <thead>
                  <tr>
                    <th style={{ ...c.th, ...c.ilkSutun, textAlign: "left", background: "#f8fafc", zIndex: 2 }}><Ipucu metin="Sayıya tıklayınca o danışmanın o aşamadaki data listesi açılır.">Danışman</Ipucu></th>
                    {asamalar.map(a => <th key={a.id} style={c.th}>{a.ad}</th>)}
                    <th style={{ ...c.th, background: "#ecfeff", color: "#0e7490" }}>Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {gorunen.map((r, i) => {
                    const zemin = i % 2 ? "#fbfdff" : "#fff";
                    return (
                      <tr key={r.diger ? "diger" : r.email} style={{ background: zemin }}>
                        <td style={{ ...c.td, ...c.ilkSutun, textAlign: "left", background: zemin, fontWeight: 600, color: r.diger ? "#94a3b8" : "#0f172a", whiteSpace: "nowrap" }}>
                          {r.diger ? <Ipucu metin="Satış ekibinde olmayan ya da ID sekmesinde eşleşmeyen data sahipleri.">{r.ad}</Ipucu> : r.ad}
                          {isAdmin && r.sube && <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 500 }}> · {r.sube}</span>}
                        </td>
                        {asamalar.map(a => <td key={a.id} style={c.td}>{sayiHucresi(r, a, r.sayilar[a.id] || 0)}</td>)}
                        <td style={{ ...c.td, background: "#f0fdff" }}>{sayiHucresi(r, null, r.toplam, { fontWeight: 700, color: "#0891b2" })}</td>
                      </tr>
                    );
                  })}
                  {gorunen.length > 1 && (
                    <tr style={{ background: "#f8fafc" }}>
                      <td style={{ ...c.td, ...c.ilkSutun, textAlign: "left", background: "#f8fafc", fontWeight: 700, color: "#0f172a" }}>Toplam</td>
                      {asamalar.map(a => <td key={a.id} style={{ ...c.td, fontWeight: 700, color: "#0f172a" }}>{sutunToplam(a.id).toLocaleString("tr-TR")}</td>)}
                      <td style={{ ...c.td, fontWeight: 700, color: "#0891b2", background: "#ecfeff" }}>{genelToplam.toLocaleString("tr-TR")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {secim && kaynaklar.length > 0 && (
        <LeadPaneli key={`${secim.anahtar}:${kaynakAnahtari}:${gun}`} secim={secim} kaynaklar={kaynaklar} gun={gun}
          kaynakAd={kaynakAdlari} asamalar={asamalar} onKapat={() => setSecim(null)}
          hedefler={atamaHedefleri} onAktarildi={() => { sessiz.current = true; setYenile(n => n + 1); }} />
      )}
    </>
  );
}

// Tıklanan hücrenin lead listesi. Sadece açılınca çekilir.
function LeadPaneli({ secim, kaynaklar, gun, kaynakAd, asamalar, onKapat, hedefler, onAktarildi }) {
  const [veri, setVeri] = useState(null);
  const [hata, setHata] = useState(null);
  const [isaretli, setIsaretli] = useState([]); // Danışman Ata için seçilen data id'leri
  const [aktarim, setAktarim] = useState(false); // aktarım sürerken kutucuklar kilitli
  const ref = useRef(null);
  const notOnbellek = useRef({});
  const atanabilir = !!hedefler?.length;
  const [sayfaBoyu, setSayfaBoyu] = useState(20);
  const [sayfa, setSayfa] = useState(1);
  const tumLeadler = veri?.leadler || [];
  const sayfaSayisi = Math.max(1, Math.ceil(tumLeadler.length / sayfaBoyu));
  const gecerliSayfa = Math.min(sayfa, sayfaSayisi);
  const sayfaLeadleri = tumLeadler.slice((gecerliSayfa - 1) * sayfaBoyu, gecerliSayfa * sayfaBoyu);

  function yukle() {
    return apiCagir({ islem: "liste", kaynaklar, gun, ownerIds: secim.ownerIds, asama: secim.asama })
      .then(setVeri)
      .catch(e => setHata(e.message));
  }
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    yukle();
  }, []);

  const tumuIsaretli = sayfaLeadleri.length > 0 && sayfaLeadleri.every(l => isaretli.includes(l.id));
  const isaretle = id => setIsaretli(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));

  const asamaAdi = id => asamalar.find(a => a.id === id)?.ad || "";

  return (
    <div ref={ref} style={{ ...c.tablo, marginTop: "20px", scrollMarginTop: "80px" }}>
      <div style={c.tabloBaslik}>
        <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
          {secim.baslik} · {secim.asamaAd} <span style={{ color: "#94a3b8", fontWeight: 500 }}>· {kaynakAd}</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {veri && <span style={{ fontSize: "12px", color: "#94a3b8" }}>{veri.toplam.toLocaleString("tr-TR")} Data{veri.toplam > veri.leadler.length ? `, ilk ${veri.leadler.length} gösteriliyor` : ""}</span>}
          <button onClick={onKapat} style={c.kapatBtn} title="Kapat">✕</button>
        </span>
      </div>
      {atanabilir && (
        <DanismanAta isaretli={isaretli} setIsaretli={setIsaretli} hedefler={hedefler} onMesgul={setAktarim}
          onAktarildi={() => { yukle(); onAktarildi?.(); }} />
      )}
      {!veri && !hata && <div style={c.bos}><span style={c.spinner} /> Datalar alınıyor...</div>}
      {hata && <div style={{ ...c.hata, margin: "16px" }}>{hata}</div>}
      {veri && (
        <>
        <div style={{ overflowX: "auto" }}>
          <table style={c.grid}>
            <thead>
              <tr>
                {atanabilir && (
                  <th style={{ ...c.th, textAlign: "center", position: "sticky", top: 0, width: "36px" }}>
                    <input type="checkbox" checked={tumuIsaretli} disabled={!!aktarim} aria-label="Bu sayfadakileri seç"
                      onChange={() => { const idler = sayfaLeadleri.map(l => l.id); setIsaretli(s => (tumuIsaretli ? s.filter(id => !idler.includes(id)) : [...new Set([...s, ...idler])])); }} style={{ accentColor: "#0891b2", cursor: "pointer" }} />
                  </th>
                )}
                <th style={{ ...c.th, textAlign: "left", position: "sticky", top: 0 }}>Data ID</th>
                <th style={{ ...c.th, textAlign: "left", position: "sticky", top: 0 }}>Ad Soyad</th>
                {!secim.asama && <th style={{ ...c.th, textAlign: "left", position: "sticky", top: 0 }}>Aşama</th>}
                <th style={{ ...c.th, textAlign: "left", position: "sticky", top: 0 }}>Kaynak</th>
                <th style={{ ...c.th, position: "sticky", top: 0 }}>Oluşturma</th>
                <th style={{ ...c.th, position: "sticky", top: 0 }}>Son aktivite</th>
                <th style={{ ...c.th, position: "sticky", top: 0 }}>Sonraki task</th>
                <th style={{ ...c.th, textAlign: "center", position: "sticky", top: 0 }}>Notlar</th>
              </tr>
            </thead>
            <tbody>
              {sayfaLeadleri.map((l, i) => (
                <tr key={l.id} style={{ background: isaretli.includes(l.id) ? "#ecfeff" : i % 2 ? "#fbfdff" : "#fff" }}>
                  {atanabilir && (
                    <td style={{ ...c.td, textAlign: "center" }}>
                      <input type="checkbox" checked={isaretli.includes(l.id)} disabled={!!aktarim} onChange={() => isaretle(l.id)}
                        aria-label={`Data ${l.id} seç`} style={{ accentColor: "#0891b2", cursor: "pointer" }} />
                    </td>
                  )}
                  <td style={{ ...c.td, textAlign: "left" }}>
                    <a href={KYLAS_LEAD_URL(l.id)} target="_blank" rel="noopener noreferrer" style={c.link}>{l.id}</a>
                  </td>
                  <td style={{ ...c.td, textAlign: "left", color: "#0f172a", fontWeight: 600, whiteSpace: "nowrap" }}>{l.ad || <span style={{ color: "#cbd5e1" }}>İsimsiz</span>}</td>
                  {!secim.asama && <td style={{ ...c.td, textAlign: "left", whiteSpace: "nowrap" }}>{asamaAdi(l.asama)}</td>}
                  <td style={{ ...c.td, textAlign: "left", whiteSpace: "nowrap" }}>
                    {KAYNAKLAR.find(k => k.id === l.kaynak)?.ad || "Diğer"}
                    {VIP_KAYNAKLAR.includes(l.kaynak) && <span style={c.vip}>VIP</span>}
                  </td>
                  <td style={c.td}>{tarih(l.olusturma)}</td>
                  <td style={c.td}>{tarih(l.sonAktivite) || <span style={{ color: "#cbd5e1" }}>·</span>}</td>
                  <td style={{ ...c.td, color: l.sonrakiTask && new Date(l.sonrakiTask) < new Date() ? "#dc2626" : undefined }}>
                    {tarih(l.sonrakiTask) || <span style={{ color: "#cbd5e1" }}>·</span>}
                  </td>
                  <td style={{ ...c.td, textAlign: "center" }}><NotBalonu lead={l} onbellek={notOnbellek} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {tumLeadler.length > 0 && (
          <Sayfalama toplam={tumLeadler.length} sayfaBoyu={sayfaBoyu} onSayfaBoyu={n => { setSayfaBoyu(n); setSayfa(1); }}
            sayfa={gecerliSayfa} sayfaSayisi={sayfaSayisi} onSayfa={setSayfa} />
        )}
        </>
      )}
    </div>
  );
}

// Liste altı sayfalama: sayfa başına 10 / 20 / 30 / 50 ve sayfa düğmeleri (Aktivite Tablosu'ndakiyle aynı görünüm)
export const SAYFA_BOYLARI = [10, 20, 30, 50];
export function Sayfalama({ toplam, sayfaBoyu, onSayfaBoyu, sayfa, sayfaSayisi, onSayfa }) {
  const dugme = (metin, hedef, kapali, baslik) => (
    <button onClick={() => onSayfa(hedef)} disabled={kapali} title={baslik}
      style={{ ...c.kucuk, opacity: kapali ? 0.4 : 1, cursor: kapali ? "default" : "pointer" }}>{metin}</button>
  );
  return (
    <div style={c.sayfalama}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Sayfa başına</span>
        {SAYFA_BOYLARI.map(n => <button key={n} onClick={() => onSayfaBoyu(n)} style={sayfaBoyu === n ? c.kucukAktif : c.kucuk}>{n}</button>)}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "12px", color: "#64748b", fontVariantNumeric: "tabular-nums" }}>
          {(sayfa - 1) * sayfaBoyu + 1}-{Math.min(sayfa * sayfaBoyu, toplam)} / {toplam}
        </span>
        {dugme("«", 1, sayfa === 1, "İlk sayfa")}
        {dugme("‹", sayfa - 1, sayfa === 1, "Önceki sayfa")}
        <span style={{ fontSize: "12px", color: "#0f172a", fontWeight: 600, minWidth: "64px", textAlign: "center" }}>Sayfa {sayfa} / {sayfaSayisi}</span>
        {dugme("›", sayfa + 1, sayfa === sayfaSayisi, "Sonraki sayfa")}
        {dugme("»", sayfaSayisi, sayfa === sayfaSayisi, "Son sayfa")}
      </div>
    </div>
  );
}

// Not ikonu: üzerine gelince lead'in son 3 notu çekilir (bir kez) ve balonda gösterilir.
export function NotBalonu({ lead, onbellek }) {
  const [konum, setKonum] = useState(null);
  const [durum, setDurum] = useState(onbellek.current[lead.id] || null);
  const zamanlayici = useRef(null);

  function ac(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const genislik = 360;
    setKonum({ left: Math.max(12, Math.min(r.right - genislik, window.innerWidth - genislik - 12)), top: r.bottom + 6, alttan: window.innerHeight - r.top + 6, yukari: r.bottom > window.innerHeight - 260 });
    if (onbellek.current[lead.id]) { setDurum(onbellek.current[lead.id]); return; }
    setDurum({ yukleniyor: true });
    apiCagir({ islem: "notlar", leadId: lead.id, ownerId: lead.ownerId })
      .then(d => { onbellek.current[lead.id] = d; setDurum(d); })
      .catch(err => setDurum({ hata: err.message }));
  }

  return (
    <span style={{ display: "inline-block" }}
      onMouseEnter={e => { clearTimeout(zamanlayici.current); ac(e); }}
      onMouseLeave={() => { zamanlayici.current = setTimeout(() => setKonum(null), 150); }}>
      <span style={c.notIkon} aria-label="Son notlar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>
        </svg>
      </span>
      {konum && (
        <div style={{ ...c.balon, left: konum.left, ...(konum.yukari ? { bottom: konum.alttan } : { top: konum.top }) }}
          onMouseEnter={() => clearTimeout(zamanlayici.current)}
          onMouseLeave={() => setKonum(null)}>
          {durum?.yukleniyor && <div style={{ color: "#64748b" }}>Notlar alınıyor...</div>}
          {durum?.hata && <div style={{ color: "#991b1b" }}>{durum.hata}</div>}
          {durum?.notlar && durum.notlar.length === 0 && <div style={{ color: "#64748b" }}>Bu Data'da not yok.</div>}
          {durum?.notlar?.map((n, i) => (
            <div key={i} style={{ paddingBottom: "10px", marginBottom: "10px", borderBottom: i < durum.notlar.length - 1 ? "1px solid #f1f5f9" : "none" }}>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>{tarih(n.tarih, true)}{n.yazan ? ` · ${n.yazan}` : ""}</div>
              <div style={{ whiteSpace: "pre-wrap", color: "#0f172a" }}>{n.metin || <span style={{ color: "#cbd5e1" }}>Boş not</span>}</div>
            </div>
          ))}
          {durum?.toplam > (durum?.notlar?.length || 0) && (
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>Toplam {durum.toplam} not, son {durum.notlar.length} tanesi gösteriliyor.</div>
          )}
        </div>
      )}
    </span>
  );
}

const chipTemel = { padding: "7px 14px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'Sora', sans-serif", transition: "all 0.15s" };
// Filtre çerçevelerinin renkleri: aynı filtre her sekmede aynı renkte (başlık yerine renkli çerçeve)
export const BASLIK_RENK = { danisman: "#0891b2", sube: "#6366f1", kaynak: "#d97706", tarih: "#7c3aed", asama: "#059669", kampanya: "#db2777" };
// Filtreyi saran renkli çerçeve. metin verilirse üzerine gelince açıklama balonu çıkar (açılır menülü filtrelerde verilmez, balon menüyü örter).
export function Cerceve({ tur, metin, children, style }) {
  const renk = BASLIK_RENK[tur];
  const kutu = (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", flexWrap: "wrap", padding: "6px", borderRadius: "18px",
      border: `1.5px solid ${renk}`, background: `${renk}0d`, ...style }}>
      {children}
    </div>
  );
  return metin ? <Ipucu metin={metin} blok isaret={false} style={{ display: "inline-block" }}>{kutu}</Ipucu> : kutu;
}

export const c = {
  panel: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "20px", padding: "20px 24px", marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  etiket: { fontSize: "11px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" },
  chipSatir: { display: "flex", flexWrap: "wrap", gap: "8px" },
  chip: { ...chipTemel, background: "#fff", color: "#475569", border: "1.5px solid #e2e8f0" },
  chipAktif: { ...chipTemel, background: "#0891b2", color: "#fff", border: "1.5px solid #0891b2" },
  bos: { display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "48px 0", color: "#64748b", fontSize: "14px" },
  hata: { background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "12px", padding: "16px 20px", color: "#991b1b", fontSize: "13px", fontWeight: 500, marginBottom: "16px" },
  spinner: { display: "inline-block", width: "18px", height: "18px", border: "2px solid #e2e8f0", borderTopColor: "#0891b2", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  tablo: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "20px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", animation: "fadeUp 0.4s ease-out" },
  tabloBaslik: { padding: "18px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" },
  grid: { width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: "13px" },
  th: { padding: "10px 12px", textAlign: "right", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap", background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0", borderRight: "1px solid #e2e8f0", zIndex: 1 },
  td: { padding: "8px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#334155", borderBottom: "1px solid #eef2f6", borderRight: "1px solid #eef2f6" },
  ilkSutun: { position: "sticky", left: 0, borderRight: "1.5px solid #e2e8f0" },
  sayiBtn: { background: "none", border: "none", padding: "3px 6px", margin: "-3px -6px", borderRadius: "6px", cursor: "pointer", font: "inherit", color: "#0f172a", fontVariantNumeric: "tabular-nums", textDecoration: "underline", textDecorationColor: "#cbd5e1", textUnderlineOffset: "3px" },
  sayiBtnSecili: { background: "#0891b2", color: "#fff", textDecoration: "none" },
  atamaCubugu: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", padding: "10px 24px", background: "#ecfeff",
    borderBottom: "1px solid #a5f3fc", fontSize: "13px" },
  atamaSecim: { height: "34px", padding: "0 12px", borderRadius: "999px", border: "1.5px solid #0891b2", background: "#fff", color: "#0f172a",
    fontSize: "12px", fontWeight: 700, fontFamily: "'Sora', sans-serif", cursor: "pointer" },
  atamaSonuc: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "10px 24px", fontSize: "13px", fontWeight: 600 },
  atamaTamam: { background: "#f0fdf4", color: "#166534", borderBottom: "1px solid #bbf7d0" },
  atamaUyari: { background: "#fffbeb", color: "#92400e", borderBottom: "1px solid #fde68a" },
  atamaHata: { background: "#fef2f2", color: "#991b1b", borderBottom: "1px solid #fecaca" },
  sayfalama: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", padding: "12px 24px", borderTop: "1px solid #f1f5f9" },
  kucuk: { minWidth: "30px", height: "28px", padding: "0 8px", borderRadius: "8px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: "12px", fontWeight: 600, cursor: "pointer" },
  kucukAktif: { minWidth: "30px", height: "28px", padding: "0 8px", borderRadius: "8px", border: "1.5px solid #0891b2", background: "#0891b2", color: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer" },
  kapatBtn: { width: "28px", height: "28px", borderRadius: "8px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontSize: "12px" },
  link: { color: "#0891b2", fontWeight: 600, textDecoration: "none", fontVariantNumeric: "tabular-nums" },
  vip: { marginLeft: "6px", padding: "1px 6px", borderRadius: "6px", background: "#fef3c7", color: "#92400e", fontSize: "10px", fontWeight: 700 },
  notIkon: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: "28px", height: "28px", borderRadius: "8px", color: "#64748b", cursor: "default", background: "#f1f5f9" },
  balon: { position: "fixed", width: "360px", maxHeight: "320px", overflowY: "auto", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 12px 32px rgba(15,23,42,0.16)", padding: "14px 16px", fontSize: "13px", lineHeight: 1.5, textAlign: "left", zIndex: 50 },
};
