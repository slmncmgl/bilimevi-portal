// v1.2: Data tarihi açılışta "Tümü"
// v1.1: "Kayıt dönüşümü dönemi" -> "Data tarihi": Tümü + açılır liste (Son 7 / 14 / 30 / N gün, TarihSecici.jsx)
// v1.0: Performans Analizi > Performans Değerlendirme sekmesi
// Amaç: yeni gelen data'yı şube şube kime atamak daha uygun, onu göstermek.
// Her danışman için bir "müsaitlik" barı (0-100) ve ayrıca kayıt dönüşümü görünür. Satıra tıklayınca barın nedenleri açılır.
// Müsaitlik = %60 takip (takipsiz olmayan açık data payı) + %25 yük (açık data, ekip ortancasına göre) + %15 hız ("Yeni"de 1 günden
// fazla bekleyen data). Kayıt dönüşümü bara girmez, ayrı sütundur: dönemde oluşan datalardan Kylas'ta "Yeni Kayıt" aşamasında olanlar.
// Kylas'ta "müsait değil" (izinli) işaretli danışman öneriye girmez.
// Kaynak anahtarları: Tüm datalar / Reklam / Imports-Fuar / VIP. Açık olan gruplar birleşir; Tüm datalar açılınca diğerleri kapanır.
// Sayılar /api/crm-rapor islem "degerlendirme"den gelir. Rol kuralı diğer sekmelerle aynı.
import { useState, useEffect } from "react";
import { VIP_KAYNAKLAR } from "../lib/vipKaynaklar";
import { apiCagir, kucuk, kisileriYukle, c } from "./CrmRaporu";
import TarihSecici from "./TarihSecici";

export const DEGERLENDIRME_SURUM = "v1.2"; // 1. satırdaki sürümle aynı tut (sayfanın altındaki etikette görünür)

// Kylas "Kaynak" picklist ID'leri
const KAYNAK_GRUPLARI = [
  { k: "reklam", ad: "Reklam", aciklama: "Instagram, Facebook, Google, Websitesi", kaynaklar: [2675584, 2674021, 2652456, 2941507] },
  { k: "importsFuar", ad: "Imports / Fuar", aciklama: "Imports, Fuar", kaynaklar: [2753894, 2650987] },
  { k: "vip", ad: "VIP Datalar", aciklama: "Referans, Bilgi İstek Formu, Ofis, Instagram DM, Eski Öğrenci, Setrow Marketing", kaynaklar: VIP_KAYNAKLAR },
];
const SESSIZ_GUN = 14;
const AGIRLIK = { takip: 0.6, yuk: 0.25, hiz: 0.15 };
const HIZ_SINIR = 30; // "Yeni"de bu kadar ya da daha fazla data bekliyorsa hız puanı 0

const sinirla = v => Math.max(0, Math.min(100, v));
const ortanca = dizi => {
  if (!dizi.length) return 0;
  const s = [...dizi].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const yuzde = (a, b) => (b ? (100 * a) / b : 0);
const yuzdeYaz = v => `%${v.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`;
const renk = p => (p >= 70 ? "#16a34a" : p >= 40 ? "#d97706" : "#dc2626");

function puanla(d, ortancaAcik) {
  const takip = d.acik ? sinirla(100 - yuzde(d.takipsiz, d.acik)) : 100;
  const yuk = ortancaAcik > 0 ? sinirla(100 * (1 - d.acik / (2 * ortancaAcik))) : 100;
  const hiz = sinirla(100 * (1 - d.yeniBekleyen / HIZ_SINIR));
  return { takip: Math.round(takip), yuk: Math.round(yuk), hiz: Math.round(hiz), toplam: Math.round(AGIRLIK.takip * takip + AGIRLIK.yuk * yuk + AGIRLIK.hiz * hiz) };
}

export default function PerformansDegerlendirme({ user, isAdmin, isManager }) {
  const [kisiler, setKisiler] = useState(null);
  const [kisiHata, setKisiHata] = useState(null);
  const [gruplar, setGruplar] = useState([]); // açık kaynak grupları; boşsa "Tüm datalar"
  const [gun, setGun] = useState(null); // null = Tümü (tüm zamanlar), açılışta Tümü
  const [rapor, setRapor] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState(null);
  const [acikSatir, setAcikSatir] = useState(null); // nedenleri açık olan danışman id'si

  useEffect(() => {
    kisileriYukle().then(setKisiler).catch(() => setKisiHata("Danışman listesi okunamadı."));
  }, []);

  // Rolüne göre görebildiği danışmanlar: admin satış ekibi, manager şubesinin satışçıları, staff kendisi
  const tumu = kisiler ? Object.entries(kisiler).map(([id, k]) => ({ id, ...k })).filter(k => k.personelde) : [];
  const gorunen = (isAdmin || isManager ? tumu.filter(k => k.satis) : tumu).filter(k => {
    if (isAdmin) return true;
    if (isManager) return kucuk(k.sube) === kucuk(user?.branch);
    return k.email === kucuk(user?.email) || kucuk(k.ad) === kucuk(user?.name);
  });
  const gorunenAnahtar = gorunen.map(k => k.id).sort().join(",");

  const grupDegistir = k => setGruplar(s => (s.includes(k) ? s.filter(x => x !== k) : [...s, k]));
  const kaynaklar = [...new Set(KAYNAK_GRUPLARI.filter(g => gruplar.includes(g.k)).flatMap(g => g.kaynaklar))];
  const grupAnahtari = [...gruplar].sort().join(",");

  // Anahtarlara art arda basılabilir: istek 400 ms bekleyip tek seferde gider
  useEffect(() => {
    if (!gorunenAnahtar) return;
    let iptal = false;
    setYukleniyor(true);
    setHata(null);
    const zamanlayici = setTimeout(() => {
      apiCagir({ islem: "degerlendirme", ownerIds: gorunenAnahtar.split(",").map(Number), gun, sessizGun: SESSIZ_GUN, kaynaklar })
        .then(d => { if (!iptal) setRapor(d); })
        .catch(e => { if (!iptal) { setRapor(null); setHata(e.message); } })
        .finally(() => { if (!iptal) setYukleniyor(false); });
    }, 400);
    return () => { iptal = true; clearTimeout(zamanlayici); };
  }, [gorunenAnahtar, grupAnahtari, gun]);

  // Satırlar: sayılar + puan. Yük puanı görünen ekibin ortanca açık data sayısına göre.
  const satirlar = [];
  if (rapor && kisiler) {
    const ort = ortanca(gorunen.map(k => rapor.danismanlar[k.id]?.acik).filter(v => v !== undefined));
    gorunen.forEach(k => {
      const d = rapor.danismanlar[k.id];
      if (d) satirlar.push({ ...k, ...d, puan: puanla(d, ort), ortancaAcik: ort });
    });
  }
  const subeler = [...new Set(satirlar.map(r => r.sube || "Şubesiz"))].sort((a, b) => a.localeCompare(b, "tr"));
  const sirala = liste => [...liste].sort((a, b) => (a.musait === b.musait ? b.puan.toplam - a.puan.toplam : a.musait ? -1 : 1));
  const seciliAdlar = gruplar.length ? KAYNAK_GRUPLARI.filter(g => gruplar.includes(g.k)).map(g => g.ad).join(" + ") : "Tüm datalar";

  return (
    <>
      <div style={c.panel}>
        <div style={{ display: "flex", gap: "28px", flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <div style={c.etiket}>Data kaynağı</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <Anahtar ad="Tüm datalar" acik={!gruplar.length} onClick={() => setGruplar([])} />
              {KAYNAK_GRUPLARI.map(g => (
                <Anahtar key={g.k} ad={g.ad} ipucu={g.aciklama} acik={gruplar.includes(g.k)} onClick={() => grupDegistir(g.k)} vip={g.k === "vip"} />
              ))}
            </div>
          </div>
          <div>
            <div style={c.etiket}>Data tarihi</div>
            <TarihSecici deger={gun} onChange={setGun} />
          </div>
        </div>
      </div>

      {kisiHata && <div style={c.hata}>{kisiHata}</div>}
      {kisiler && !gorunen.length && <div style={c.bos}>Görüntüleyebileceğiniz danışman bulunmuyor.</div>}
      {gorunen.length > 0 && yukleniyor && <div style={c.bos}><span style={c.spinner} /> Kylas'tan sayılar alınıyor...</div>}
      {gorunen.length > 0 && !yukleniyor && hata && <div style={c.hata}>{hata}</div>}

      {gorunen.length > 0 && !yukleniyor && !hata && rapor && subeler.map(sube => {
        const liste = sirala(satirlar.filter(r => (r.sube || "Şubesiz") === sube));
        const oneri = liste.find(r => r.musait);
        return (
          <div key={sube} style={{ ...c.tablo, marginBottom: "20px" }}>
            <div style={c.tabloBaslik}>
              <span style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>{sube} <span style={{ color: "#94a3b8", fontWeight: 500, fontSize: "12px" }}>· {seciliAdlar}</span></span>
              {oneri ? (
                <span style={p.oneri}>Yeni data için öneri: <b>{oneri.ad}</b> · müsaitlik {oneri.puan.toplam}</span>
              ) : (
                <span style={{ ...p.oneri, background: "#f1f5f9", color: "#64748b", borderColor: "#e2e8f0" }}>Müsait danışman yok</span>
              )}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={c.grid}>
                <thead>
                  <tr>
                    <th style={{ ...c.th, textAlign: "left" }}>Danışman</th>
                    <th style={{ ...c.th, textAlign: "left", minWidth: "220px" }}>Müsaitlik</th>
                    <th style={c.th}>Takipsiz / açık Data</th>
                    <th style={c.th}>Kayıt dönüşümü ({gun ? `${gun} gün` : "tüm zamanlar"})</th>
                    <th style={c.th}>"Yeni"de bekleyen</th>
                  </tr>
                </thead>
                <tbody>
                  {liste.map((r, i) => {
                    const acik = acikSatir === r.id;
                    const takipsizOran = yuzde(r.takipsiz, r.acik);
                    return (
                      <FragmentSatir key={r.id}>
                        <tr onClick={() => setAcikSatir(acik ? null : r.id)} title="Nedenlerini göster"
                          style={{ cursor: "pointer", background: acik ? "#ecfeff" : i % 2 ? "#fbfdff" : "#fff", opacity: r.musait ? 1 : 0.6 }}>
                          <td style={{ ...c.td, textAlign: "left", fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>
                            <span style={{ color: "#94a3b8", fontSize: "10px", marginRight: "6px" }}>{acik ? "▼" : "▶"}</span>{r.ad}
                            {oneri?.id === r.id && <span style={p.oneriEtiket}>Öneri</span>}
                          </td>
                          <td style={{ ...c.td, textAlign: "left" }}>
                            {r.musait ? <Bar deger={r.puan.toplam} /> : <span style={p.izin}>İzinli{r.izinBitis ? ` · ${new Date(r.izinBitis).toLocaleDateString("tr-TR")} tarihine kadar` : ""}</span>}
                          </td>
                          <td style={{ ...c.td, whiteSpace: "nowrap" }}>
                            <b style={{ color: renk(100 - takipsizOran) }}>{r.takipsiz}</b> / {r.acik}
                            <span style={p.soluk}> · {yuzdeYaz(Math.round(takipsizOran))}</span>
                          </td>
                          <td style={{ ...c.td, whiteSpace: "nowrap" }}>
                            <b style={{ color: "#0f172a" }}>{r.kayit}</b> / {r.data.toLocaleString("tr-TR")}
                            <span style={p.soluk}> · {yuzdeYaz(yuzde(r.kayit, r.data))}</span>
                          </td>
                          <td style={{ ...c.td, color: r.yeniBekleyen >= 10 ? "#dc2626" : undefined, fontWeight: r.yeniBekleyen >= 10 ? 700 : 400 }}>{r.yeniBekleyen}</td>
                        </tr>
                        {acik && (
                          <tr>
                            <td colSpan={5} style={{ ...c.td, textAlign: "left", background: "#f8fafc", padding: "14px 20px" }}>
                              <div style={p.nedenler}>
                                <Neden ad="Takip" agirlik="%60" puan={r.puan.takip}
                                  metin={`${r.acik} açık Data'nın ${r.takipsiz} tanesi takipsiz (${yuzdeYaz(Math.round(takipsizOran))}).`} />
                                <Neden ad="Yük" agirlik="%25" puan={r.puan.yuk}
                                  metin={`${r.acik} açık Data. Ekip ortancası ${Math.round(r.ortancaAcik)}.`} />
                                <Neden ad="Hız" agirlik="%15" puan={r.puan.hiz}
                                  metin={`"Yeni" aşamasında ${r.yeni} Data var, ${r.yeniBekleyen} tanesi 1 günden fazla bekliyor.`} />
                              </div>
                              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "10px" }}>
                                Task zorunlu Data (İlgili + VIP Görüşme): <b>{r.taskBeklenen}</b> · ileri tarihli task {r.ileriTask} · gecikmiş task {r.gecikmisTask} · task yok {r.taskYok}
                                {!r.musait && <> · <b style={{ color: "#b45309" }}>Kylas'ta data atamasına kapalı (izinli)</b></>}
                              </div>
                            </td>
                          </tr>
                        )}
                      </FragmentSatir>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {gorunen.length > 0 && !yukleniyor && !hata && rapor && (
        <div style={p.dipnot}>
          Müsaitlik = %60 takip + %25 yük + %15 hız. Takipsiz kuralı Aktivite Tablosu ile aynı ({SESSIZ_GUN} gün). Kayıt dönüşümü bara girmez.
          <br />Kayıt dönüşümü: Data tarihi seçimine göre oluşan datalardan Kylas'ta "Yeni Kayıt" aşamasında olanlar. Yaz okulu grup kayıtları CRM dışında olduğu için dahil değil.
          {!rapor.musaitlikOkundu && <><br />Kylas müsaitlik bilgisi okunamadı, herkes müsait sayıldı.</>}
        </div>
      )}
    </>
  );
}

// tbody içinde birden fazla <tr> döndürmek için
function FragmentSatir({ children }) { return <>{children}</>; }

function Anahtar({ ad, acik, onClick, ipucu, vip }) {
  const ana = vip ? "#d97706" : "#0891b2";
  return (
    <button type="button" role="switch" aria-checked={acik} onClick={onClick} title={ipucu}
      style={{ ...p.anahtar, borderColor: acik ? ana : "#e2e8f0", background: acik ? (vip ? "#fffbeb" : "#ecfeff") : "#fff", color: acik ? "#0f172a" : "#64748b" }}>
      <span style={{ ...p.ray, background: acik ? ana : "#cbd5e1" }}>
        <span style={{ ...p.top, transform: acik ? "translateX(14px)" : "none" }} />
      </span>
      {ad}
    </button>
  );
}

function Bar({ deger }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={p.barZemin}><div style={{ width: `${deger}%`, height: "100%", background: renk(deger), borderRadius: "99px", transition: "width 0.4s" }} /></div>
      <span style={{ fontSize: "13px", fontWeight: 700, color: renk(deger), minWidth: "26px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{deger}</span>
    </div>
  );
}

function Neden({ ad, agirlik, puan, metin }) {
  return (
    <div style={p.neden}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
        <span style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>{ad} <span style={{ color: "#94a3b8", fontWeight: 500 }}>· ağırlık {agirlik}</span></span>
        <span style={{ fontSize: "13px", fontWeight: 700, color: renk(puan), fontVariantNumeric: "tabular-nums" }}>{puan}</span>
      </div>
      <div style={{ ...p.barZemin, height: "6px", marginBottom: "6px" }}><div style={{ width: `${puan}%`, height: "100%", background: renk(puan), borderRadius: "99px" }} /></div>
      <div style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.4 }}>{metin}</div>
    </div>
  );
}

const p = {
  anahtar: { display: "inline-flex", alignItems: "center", gap: "8px", padding: "7px 14px 7px 8px", borderRadius: "999px", border: "1.5px solid", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'Sora', sans-serif", transition: "all 0.15s" },
  ray: { position: "relative", width: "30px", height: "16px", borderRadius: "99px", flexShrink: 0, transition: "background 0.15s" },
  top: { position: "absolute", top: "2px", left: "2px", width: "12px", height: "12px", borderRadius: "50%", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.25)", transition: "transform 0.15s" },
  barZemin: { flex: 1, height: "10px", background: "#e2e8f0", borderRadius: "99px", overflow: "hidden", minWidth: "120px" },
  oneri: { padding: "6px 14px", borderRadius: "999px", background: "#f0fdf4", border: "1.5px solid #86efac", color: "#166534", fontSize: "12px" },
  oneriEtiket: { marginLeft: "8px", padding: "1px 7px", borderRadius: "6px", background: "#dcfce7", color: "#166534", fontSize: "10px", fontWeight: 700 },
  izin: { display: "inline-block", padding: "3px 10px", borderRadius: "999px", background: "#f1f5f9", color: "#475569", fontSize: "12px", fontWeight: 600 },
  soluk: { color: "#94a3b8", fontSize: "11px" },
  nedenler: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" },
  neden: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "12px 14px" },
  dipnot: { fontSize: "11px", color: "#94a3b8", marginTop: "4px", textAlign: "right", lineHeight: 1.5 },
};
