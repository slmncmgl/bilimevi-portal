// v2.1: ekrandaki "lead" yazıları "Data" oldu. Task sadece İlgili'de beklenir (Görüşme de çıkarıldı, sunucu crm-rapor v1.9)
// v2.0: ekran açılınca görebildiği tüm danışmanlar ve VIP Datalar seçili gelir
// v1.9: task sadece Görüşme ve İlgili'de beklenir: "Task beklenen" kartı eklendi; ileri/gecikmiş task ve takip oranı
//       bu iki aşamadan hesaplanır (sunucu crm-rapor v1.8). Açık lead ve takipsiz Na1-İlgili kapsamında kaldı.
// v1.8: danışman çoklu seçim (Tümünü seç / Temizle). Birden fazla danışman seçiliyse kartlar toplamı gösterir,
//       altta danışman karşılaştırma tablosu çıkar (satıra tıklayınca liste o danışmana süzülür), listede Danışman sütunu olur.
// v1.7: VIP Datalar'a Setrow Marketing eklendi (liste KaynakSecici.jsx'te)
// v1.6: veri kaynağı seçimi (açılır çoklu seçim, KaynakSecici.jsx) üst panelde; boşsa tüm kaynaklar.
//       Kaynak sunucuda süzülür, kartlar da seçime göre değişir. VIP Datalar neon düğmesi VIP kaynakları tek tıkla seçer/bırakır.
//       Listedeki ayrı "Kaynak" filtresi kaldırıldı.
// v1.5: "Sessizlik süresi" başlığı "Son Etkinlik Tarihi" oldu. "VIP Datalar" düğmesi öne çıkarıldı: etrafında dönen neon çerçeve ve hafif parıltı (hareket azaltma açıksa durur)
// v1.4: ekrandaki adı "Aktivite Tablosu" (dosya adı aynı kaldı)
// v1.3: "Gecikmiş task" ve "Takipsiz" kartları tıklanabilir; tıklanan kartın lead'leri aşağıda listelenir
//       (gecikmiş listede task tarihi ve kaç gün geciktiği görünür). Filtreler ve sayfalama iki listede de geçerli.
// v1.2: aşama filtresi çoklu seçim (hiçbiri seçili değilse hepsi), kaynak filtresi Tümü / VIP Datalar.
//       "İlgili" alt raporu aşama filtresine taşındı. Liste sayfalı: sayfa başına 10 / 20 / 30 / 50 (varsayılan 20).
// v1.1: danışman seçicide sadece satış ekibi (SATIS_EKIBI, CrmRaporu.jsx). Staff her durumda kendi raporunu görür.
// v1.0: Performans Analizi > Takip Raporu sekmesi
// Danışman seçilir; Bilimevi pipeline'da Na1, Na2, Na3, Görüşme, İlgili aşamalarındaki lead'lerinin takip durumu gösterilir.
// Takipsiz = açık task'ı yok ve son aktivitesi seçilen günden eski. Alt raporlar: İlgili aşaması ve VIP Datalar.
// Not: Kylas'ın "son aktivite" tarihi otomasyon güncellemeleriyle de değişir, sessizlik süresi gerçekte daha uzun olabilir.
// Rol kuralı diğer sekmelerle aynı: admin/director/owner herkesi, manager kendi şubesini, staff kendini görür.
import { useState, useEffect, useRef } from "react";
import KaynakSecici, { VIP_KAYNAKLAR } from "./KaynakSecici";
import { KAYNAKLAR, KYLAS_LEAD_URL, apiCagir, tarih, kucuk, NotBalonu, kisileriYukle, c } from "./CrmRaporu";

export const AKTIVITE_SURUM = "v2.1"; // 1. satırdaki sürümle aynı tut (sayfanın altındaki etikette görünür)

const ASAMA_ADLARI = { 222366: "Na1", 253357: "Na2", 253358: "Na3", 218701: "Görüşme", 218702: "İlgili" };
const ILGILI = 218702;
const SESSIZ_SECENEKLER = [7, 14, 30];
const ASAMA_SIRASI = [222366, 253357, 253358, 218701, 218702];
const SAYFA_BOYLARI = [10, 20, 30, 50];

const kaynakAdi = id => KAYNAKLAR.find(k => k.id === id)?.ad || "Diğer";
const gunOnce = v => (v ? Math.floor((Date.now() - new Date(v).getTime()) / 86400000) : null);

export default function TakipRaporu({ user, isAdmin, isManager }) {
  const [kisiler, setKisiler] = useState(null);
  const [kisiHata, setKisiHata] = useState(null);
  const [sube, setSube] = useState("Tümü");
  const [danismanlar, setDanismanlar] = useState([]); // seçili kylas id'leri (string)
  const [listeSahip, setListeSahip] = useState(null); // karşılaştırmada tıklanan danışman: listeyi ona süzer
  const [sessizGun, setSessizGun] = useState(14);
  const [rapor, setRapor] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState(null);
  const [asamaSecim, setAsamaSecim] = useState([]); // boşsa tüm aşamalar
  const [kaynaklar, setKaynaklar] = useState(VIP_KAYNAKLAR); // varsayılan VIP Datalar; boşsa tüm kaynaklar
  const [sayfaBoyu, setSayfaBoyu] = useState(20);
  const [sayfa, setSayfa] = useState(1);
  const [gorunum, setGorunum] = useState("takipsiz"); // "takipsiz" | "gecikmis"
  const notOnbellek = useRef({});

  useEffect(() => {
    kisileriYukle().then(setKisiler).catch(() => setKisiHata("Danışman listesi okunamadı."));
  }, []);

  // Rolüne göre seçilebilir danışmanlar
  // Admin ve manager seçicisinde sadece satış ekibi; staff kendini görür
  const tumu = kisiler ? Object.entries(kisiler).map(([id, k]) => ({ id, ...k })).filter(k => k.personelde) : [];
  const satisci = tumu.filter(k => k.satis);
  const secilebilir = (isAdmin || isManager ? satisci : tumu)
    .filter(k => {
      if (isAdmin) return sube === "Tümü" || kucuk(k.sube) === kucuk(sube);
      if (isManager) return kucuk(k.sube) === kucuk(user?.branch);
      return k.email === kucuk(user?.email) || kucuk(k.ad) === kucuk(user?.name);
    })
    .sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  const subeler = ["Tümü", ...[...new Set(satisci.map(k => k.sube).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr"))];

  // Varsayılan: görebildiği tüm danışmanlar seçili (admin satış ekibi, manager şubesi, staff kendisi)
  useEffect(() => {
    if (kisiler && !danismanlar.length && secilebilir.length) setDanismanlar(secilebilir.map(k => k.id));
  }, [kisiler]);
  // Şube değişince görünmeyen danışmanlar seçimden düşer
  const secilebilirAnahtar = secilebilir.map(k => k.id).join(",");
  useEffect(() => {
    if (!kisiler) return;
    setDanismanlar(s => s.filter(id => secilebilir.some(k => k.id === id)));
  }, [secilebilirAnahtar]);
  const danismanDegistir = id => setDanismanlar(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));
  const hepsiSecili = secilebilir.length > 0 && secilebilir.every(k => danismanlar.includes(k.id));

  // Danışman ve kaynak seçimi art arda değişebilir: istek 400 ms bekleyip tek seferde gider
  const danismanAnahtari = [...danismanlar].sort().join(",");
  const kaynakAnahtari = [...kaynaklar].sort((a, b) => a - b).join(",");
  const vipSecili = kaynaklar.length === VIP_KAYNAKLAR.length && VIP_KAYNAKLAR.every(id => kaynaklar.includes(id));
  useEffect(() => {
    setListeSahip(null);
    if (!danismanlar.length) { setRapor(null); return; }
    let iptal = false;
    setYukleniyor(true);
    setHata(null);
    const zamanlayici = setTimeout(() => {
      apiCagir({ islem: "takip", ownerIds: danismanlar.map(Number), sessizGun, kaynaklar })
        .then(d => { if (!iptal) setRapor(d); })
        .catch(e => { if (!iptal) { setRapor(null); setHata(e.message); } })
        .finally(() => { if (!iptal) setYukleniyor(false); });
    }, 400);
    return () => { iptal = true; clearTimeout(zamanlayici); };
  }, [danismanAnahtari, sessizGun, kaynakAnahtari]);

  const coklu = danismanlar.length > 1;
  const kisiAdi = id => kisiler?.[String(id)]?.ad || `#${id}`;
  const secimBasligi = !coklu ? kisiAdi(danismanlar[0])
    : hepsiSecili && danismanlar.length === secilebilir.length ? `Tüm danışmanlar (${danismanlar.length})` : `${danismanlar.length} danışman`;
  // Karşılaştırma tablosu: danışman başına özet, en çok takipsizi olan üstte
  const karsilastirma = rapor?.danismanlar
    ? Object.entries(rapor.danismanlar).map(([id, d]) => ({ id, ad: kisiAdi(id), ...d, oran: d.taskBeklenen ? Math.round((d.ileriTask / d.taskBeklenen) * 100) : 0 }))
        .sort((a, b) => b.takipsiz - a.takipsiz || b.toplam - a.toplam)
    : [];
  // Liste filtresi: aşama (çoklu). Kaynak sunucuda süzülür.
  const asamaSuz = l => (!asamaSecim.length || asamaSecim.includes(l.asama)) && (!listeSahip || String(l.ownerId) === listeSahip);
  const gecikmisGorunum = gorunum === "gecikmis";
  const tumTakipsiz = (gecikmisGorunum ? rapor?.gecikmis : rapor?.takipsiz) || [];
  const liste = tumTakipsiz.filter(asamaSuz);
  const asamaSayisi = id => tumTakipsiz.filter(l => (id === null || l.asama === id) && (!listeSahip || String(l.ownerId) === listeSahip)).length;
  const asamaDegistir = id => setAsamaSecim(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));

  // Sayfalama: filtre, sayfa boyu ya da rapor değişince ilk sayfaya dön
  useEffect(() => { setSayfa(1); }, [asamaSecim, sayfaBoyu, rapor, gorunum, listeSahip]);
  const sayfaSayisi = Math.max(1, Math.ceil(liste.length / sayfaBoyu));
  const gecerliSayfa = Math.min(sayfa, sayfaSayisi);
  const sayfaListesi = liste.slice((gecerliSayfa - 1) * sayfaBoyu, gecerliSayfa * sayfaBoyu);
  const o = rapor?.ozet;
  // Takip oranı: İlgili aşamasındaki datalardan ileri tarihli task'ı olanların payı
  const takipOrani = o && o.taskBeklenen ? Math.round((o.ileriTask / o.taskBeklenen) * 100) : 0;

  return (
    <>
      <style>{VIP_CSS}</style>
      <div style={c.panel}>
        {isAdmin && subeler.length > 2 && (
          <div style={{ marginBottom: "16px" }}>
            <div style={c.etiket}>Şube</div>
            <div style={c.chipSatir}>
              {subeler.map(sb => <button key={sb} onClick={() => setSube(sb)} style={sube === sb ? c.chipAktif : c.chip}>{sb}</button>)}
            </div>
          </div>
        )}
        {(isAdmin || isManager) && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
              <div style={{ ...c.etiket, marginBottom: 0 }}>Danışman (birden fazla seçilebilir)</div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => setDanismanlar(secilebilir.map(k => k.id))} style={hepsiSecili ? c.chipAktif : c.chip}>Tümünü seç</button>
                <button onClick={() => setDanismanlar([])} disabled={!danismanlar.length}
                  style={{ ...c.chip, color: "#dc2626", borderColor: "#fecaca", opacity: danismanlar.length ? 1 : 0.4, cursor: danismanlar.length ? "pointer" : "default" }}>Temizle</button>
              </div>
            </div>
            <div style={c.chipSatir}>
              {!kisiler && !kisiHata && <span style={{ fontSize: "13px", color: "#94a3b8" }}>Yükleniyor...</span>}
              {secilebilir.map(k => {
                const var_ = danismanlar.includes(k.id);
                return <button key={k.id} onClick={() => danismanDegistir(k.id)} style={var_ ? c.chipAktif : c.chip}>{var_ ? "✓ " : ""}{k.ad}</button>;
              })}
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <div style={c.etiket}>Veri kaynağı</div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <KaynakSecici kaynaklar={KAYNAKLAR} secili={kaynaklar} onChange={setKaynaklar} bosMetin="Tüm kaynaklar" />
              <button onClick={() => setKaynaklar(vipSecili ? [] : VIP_KAYNAKLAR)} className={`vip-neon${vipSecili ? " vip-neon-aktif" : ""}`}
                title={vipSecili ? "VIP filtresini kaldır" : "Referans, Bilgi İstek Formu, Ofis, Instagram DM, Eski Öğrenci, Setrow Marketing"}>
                <span>★ VIP Datalar</span>
              </button>
            </div>
          </div>
          <div>
            <div style={c.etiket}>Son Etkinlik Tarihi</div>
            <div style={c.chipSatir}>
              {SESSIZ_SECENEKLER.map(g => <button key={g} onClick={() => setSessizGun(g)} style={sessizGun === g ? c.chipAktif : c.chip}>{g} günden eski</button>)}
            </div>
          </div>
        </div>
      </div>

      {kisiHata && <div style={c.hata}>{kisiHata}</div>}
      {kisiler && !danismanlar.length && <div style={c.bos}>Raporu görmek için bir ya da birden fazla danışman seçin.</div>}
      {danismanlar.length > 0 && yukleniyor && <div style={c.bos}><span style={c.spinner} /> Kylas'tan Datalar alınıyor...</div>}
      {danismanlar.length > 0 && !yukleniyor && hata && <div style={c.hata}>{hata}</div>}

      {danismanlar.length > 0 && !yukleniyor && !hata && rapor && (
        <>
          <div style={t.kartlar}>
            <Kart sayi={o.toplam} etiket="Açık Data (Na1-İlgili)" />
            <Kart sayi={o.taskBeklenen} etiket="Task beklenen" alt="Sadece İlgili" />
            <Kart sayi={o.ileriTask} etiket="İleri tarihli task" alt="Sadece İlgili" renk="#166534" zemin="#f0fdf4" cerceve="#86efac" />
            <Kart sayi={o.gecikmisTask} etiket="Gecikmiş task" alt="Sadece İlgili" renk="#92400e" zemin="#fffbeb" cerceve="#fde68a"
              secili={gecikmisGorunum} onClick={() => setGorunum("gecikmis")} />
            <Kart sayi={o.takipsiz} etiket={`Takipsiz (${sessizGun}+ gün)`} renk="#991b1b" zemin="#fef2f2" cerceve="#fca5a5"
              secili={!gecikmisGorunum} onClick={() => setGorunum("takipsiz")} />
            <Kart sayi={`%${takipOrani}`} etiket="Takip oranı" alt="ileri task'lı / task beklenen" />
          </div>

          {coklu && karsilastirma.length > 0 && (
            <div style={{ ...c.tablo, marginBottom: "20px" }}>
              <div style={c.tabloBaslik}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>Danışman karşılaştırması · {secimBasligi}</span>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>Satıra tıklayınca aşağıdaki liste o danışmana süzülür</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={c.grid}>
                  <thead>
                    <tr>
                      <th style={{ ...c.th, textAlign: "left" }}>Danışman</th>
                      {["Açık Data", "Task beklenen", "İleri task", "Gecikmiş task", `Takipsiz (${sessizGun}+ gün)`, "Takip oranı"].map(b => <th key={b} style={c.th}>{b}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {karsilastirma.map((d, i) => {
                      const aktif = listeSahip === d.id;
                      return (
                        <tr key={d.id} onClick={() => setListeSahip(aktif ? null : d.id)} title={aktif ? "Süzmeyi kaldır" : "Listeyi bu danışmana süz"}
                          style={{ cursor: "pointer", background: aktif ? "#ecfeff" : i % 2 ? "#fbfdff" : "#fff" }}>
                          <td style={{ ...c.td, textAlign: "left", fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>{aktif ? "▸ " : ""}{d.ad}</td>
                          <td style={c.td}>{d.toplam}</td>
                          <td style={c.td}>{d.taskBeklenen}</td>
                          <td style={{ ...c.td, color: "#166534" }}>{d.ileriTask}</td>
                          <td style={{ ...c.td, color: d.gecikmisTask ? "#92400e" : undefined }}>{d.gecikmisTask}</td>
                          <td style={{ ...c.td, color: d.takipsiz ? "#991b1b" : undefined, fontWeight: 700 }}>{d.takipsiz}</td>
                          <td style={{ ...c.td, fontWeight: 600 }}>%{d.oran}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={c.tablo}>
            <div style={c.tabloBaslik}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>{listeSahip ? kisiAdi(listeSahip) : secimBasligi} · {gecikmisGorunum ? "Gecikmiş task'lı Datalar" : `Takipsiz Datalar (${sessizGun}+ gün)`} ({liste.length})</span>
              {listeSahip && <button onClick={() => setListeSahip(null)} style={c.chip}>✕ Tüm seçili danışmanlar</button>}
            </div>
            <div style={t.filtreler}>
              <div>
                <div style={c.etiket}>Aşama (birden fazla seçilebilir)</div>
                <div style={c.chipSatir}>
                  <button onClick={() => setAsamaSecim([])} style={!asamaSecim.length ? c.chipAktif : c.chip}>Tümü ({asamaSayisi(null)})</button>
                  {ASAMA_SIRASI.map(id => (
                    <button key={id} onClick={() => asamaDegistir(id)} style={asamaSecim.includes(id) ? c.chipAktif : c.chip}>
                      {asamaSecim.includes(id) ? "✓ " : ""}{ASAMA_ADLARI[id]} ({asamaSayisi(id)})
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {liste.length === 0 ? (
              <div style={c.bos}>Bu raporda Data yok.</div>
            ) : (
              <>
              <div style={{ overflowX: "auto" }}>
                <table style={c.grid}>
                  <thead>
                    <tr>
                      {["Data ID", "Ad Soyad", ...(coklu ? ["Danışman"] : []), "Aşama", "Kaynak"].map(b => <th key={b} style={{ ...c.th, textAlign: "left", position: "sticky", top: 0 }}>{b}</th>)}
                      <th style={{ ...c.th, position: "sticky", top: 0 }}>Oluşturma</th>
                      {gecikmisGorunum && <th style={{ ...c.th, position: "sticky", top: 0 }}>Task tarihi</th>}
                      <th style={{ ...c.th, position: "sticky", top: 0 }}>Son aktivite</th>
                      <th style={{ ...c.th, textAlign: "center", position: "sticky", top: 0 }}>Notlar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sayfaListesi.map((l, i) => {
                      const g = gunOnce(l.sonAktivite);
                      return (
                        <tr key={l.id} style={{ background: i % 2 ? "#fbfdff" : "#fff" }}>
                          <td style={{ ...c.td, textAlign: "left" }}>
                            <a href={KYLAS_LEAD_URL(l.id)} target="_blank" rel="noopener noreferrer" style={c.link}>{l.id}</a>
                          </td>
                          <td style={{ ...c.td, textAlign: "left", color: "#0f172a", fontWeight: 600, whiteSpace: "nowrap" }}>{l.ad || <span style={{ color: "#cbd5e1" }}>İsimsiz</span>}</td>
                          {coklu && <td style={{ ...c.td, textAlign: "left", whiteSpace: "nowrap" }}>{kisiAdi(l.ownerId)}</td>}
                          <td style={{ ...c.td, textAlign: "left", whiteSpace: "nowrap", fontWeight: l.asama === ILGILI ? 700 : 400, color: l.asama === ILGILI ? "#0e7490" : undefined }}>{ASAMA_ADLARI[l.asama] || ""}</td>
                          <td style={{ ...c.td, textAlign: "left", whiteSpace: "nowrap" }}>
                            {kaynakAdi(l.kaynak)}
                            {VIP_KAYNAKLAR.includes(l.kaynak) && <span style={t.vip}>VIP</span>}
                          </td>
                          <td style={c.td}>{tarih(l.olusturma)}</td>
                          {gecikmisGorunum && (
                            <td style={{ ...c.td, whiteSpace: "nowrap", color: "#b45309", fontWeight: 600 }}>
                              {tarih(l.sonrakiTask)} <span style={{ fontSize: "11px", fontWeight: 400 }}>· {gunOnce(l.sonrakiTask)} gün gecikti</span>
                            </td>
                          )}
                          <td style={{ ...c.td, whiteSpace: "nowrap" }}>
                            {l.sonAktivite ? <>{tarih(l.sonAktivite)} <span style={{ color: g > 30 ? "#dc2626" : "#94a3b8", fontSize: "11px" }}>· {g} gün</span></> : <span style={{ color: "#dc2626" }}>Hiç yok</span>}
                          </td>
                          <td style={{ ...c.td, textAlign: "center" }}><NotBalonu lead={l} onbellek={notOnbellek} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={t.sayfalama}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Sayfa başına</span>
                  {SAYFA_BOYLARI.map(n => (
                    <button key={n} onClick={() => setSayfaBoyu(n)} style={sayfaBoyu === n ? t.kucukAktif : t.kucuk}>{n}</button>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "12px", color: "#64748b", fontVariantNumeric: "tabular-nums" }}>
                    {(gecerliSayfa - 1) * sayfaBoyu + 1}-{Math.min(gecerliSayfa * sayfaBoyu, liste.length)} / {liste.length}
                  </span>
                  <button onClick={() => setSayfa(1)} disabled={gecerliSayfa === 1} style={{ ...t.kucuk, opacity: gecerliSayfa === 1 ? 0.4 : 1, cursor: gecerliSayfa === 1 ? "default" : "pointer" }} title="İlk sayfa">«</button>
                  <button onClick={() => setSayfa(gecerliSayfa - 1)} disabled={gecerliSayfa === 1} style={{ ...t.kucuk, opacity: gecerliSayfa === 1 ? 0.4 : 1, cursor: gecerliSayfa === 1 ? "default" : "pointer" }} title="Önceki sayfa">‹</button>
                  <span style={{ fontSize: "12px", color: "#0f172a", fontWeight: 600, minWidth: "64px", textAlign: "center" }}>Sayfa {gecerliSayfa} / {sayfaSayisi}</span>
                  <button onClick={() => setSayfa(gecerliSayfa + 1)} disabled={gecerliSayfa === sayfaSayisi} style={{ ...t.kucuk, opacity: gecerliSayfa === sayfaSayisi ? 0.4 : 1, cursor: gecerliSayfa === sayfaSayisi ? "default" : "pointer" }} title="Sonraki sayfa">›</button>
                  <button onClick={() => setSayfa(sayfaSayisi)} disabled={gecerliSayfa === sayfaSayisi} style={{ ...t.kucuk, opacity: gecerliSayfa === sayfaSayisi ? 0.4 : 1, cursor: gecerliSayfa === sayfaSayisi ? "default" : "pointer" }} title="Son sayfa">»</button>
                </div>
              </div>
              </>
            )}
          </div>
          <div style={t.dipnot}>
            Son aktivite tarihi Kylas'tan gelir ve otomasyon güncellemeleriyle de değişir. Gerçek sessizlik süresi daha uzun olabilir.
          </div>
        </>
      )}
    </>
  );
}

function Kart({ sayi, etiket, alt, renk = "#0f172a", zemin = "#fff", cerceve = "#e2e8f0", onClick, secili }) {
  const tiklanir = !!onClick;
  return (
    <div onClick={onClick} role={tiklanir ? "button" : undefined} title={tiklanir ? "Dataları aşağıda listele" : undefined}
      style={{ ...t.kart, background: zemin, borderColor: secili ? renk : cerceve, cursor: tiklanir ? "pointer" : "default",
        boxShadow: secili ? `0 0 0 3px ${cerceve}` : t.kart.boxShadow }}>
      <div style={{ ...t.kartSayi, color: renk }}>{typeof sayi === "number" ? sayi.toLocaleString("tr-TR") : sayi}</div>
      <div style={t.kartEtiket}>{etiket}</div>
      {alt && <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>{alt}</div>}
      {tiklanir && <div style={{ fontSize: "10px", color: renk, marginTop: "4px", fontWeight: 600 }}>{secili ? "▼ Aşağıda listeleniyor" : "Listelemek için tıklayın"}</div>}
    </div>
  );
}

// VIP Datalar düğmesi: arkada dönen konik renk geçişi 2px'lik neon çerçeve gibi görünür, dışta altın parıltı nefes alır
const VIP_CSS = `
.vip-neon { position: relative; isolation: isolate; overflow: hidden; padding: 2px; border: none; border-radius: 999px;
  background: transparent; cursor: pointer; font-family: 'Sora', sans-serif; animation: vipParilti 2.4s ease-in-out infinite; }
.vip-neon::before { content: ""; position: absolute; inset: -200%; z-index: -1;
  background: conic-gradient(from 0deg, transparent 0 55%, #f59e0b 65%, #fde047 72%, #f472b6 80%, #a855f7 88%, transparent 95%);
  animation: vipDon 2.4s linear infinite; }
.vip-neon > span { display: block; padding: 5px 14px; border-radius: 999px; background: #fffbeb; color: #92400e;
  font-size: 12px; font-weight: 700; letter-spacing: 0.2px; transition: all 0.15s; }
.vip-neon:hover > span { background: #fef3c7; }
.vip-neon-aktif > span { background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; }
.vip-neon-aktif:hover > span { background: linear-gradient(135deg, #f59e0b, #b45309); }
@keyframes vipDon { to { transform: rotate(360deg); } }
@keyframes vipParilti { 0%, 100% { box-shadow: 0 0 6px rgba(245, 158, 11, 0.35); } 50% { box-shadow: 0 0 16px rgba(245, 158, 11, 0.75), 0 0 28px rgba(244, 114, 182, 0.3); } }
@media (prefers-reduced-motion: reduce) { .vip-neon, .vip-neon::before { animation: none; } .vip-neon::before { background: linear-gradient(90deg, #f59e0b, #f472b6); } }
`;

const t = {
  kartlar: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "20px", animation: "fadeUp 0.4s ease-out" },
  kart: { border: "1.5px solid", borderRadius: "16px", padding: "18px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  kartSayi: { fontSize: "26px", fontWeight: 700, marginBottom: "4px", fontVariantNumeric: "tabular-nums" },
  kartEtiket: { fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" },
  vip: { marginLeft: "6px", padding: "1px 6px", borderRadius: "6px", background: "#fef3c7", color: "#92400e", fontSize: "10px", fontWeight: 700 },
  filtreler: { display: "flex", gap: "24px", flexWrap: "wrap", padding: "14px 24px", borderBottom: "1px solid #f1f5f9", background: "#fafcff" },
  sayfalama: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", padding: "12px 24px", borderTop: "1px solid #f1f5f9" },
  kucuk: { minWidth: "30px", height: "28px", padding: "0 8px", borderRadius: "8px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: "12px", fontWeight: 600, cursor: "pointer" },
  kucukAktif: { minWidth: "30px", height: "28px", padding: "0 8px", borderRadius: "8px", border: "1.5px solid #0891b2", background: "#0891b2", color: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer" },
  dipnot: { fontSize: "11px", color: "#94a3b8", marginTop: "10px", textAlign: "right" },
};
