// v1.0: Performans Analizi > Takip Raporu sekmesi
// Danışman seçilir; Bilimevi pipeline'da Na1, Na2, Na3, Görüşme, İlgili aşamalarındaki lead'lerinin takip durumu gösterilir.
// Takipsiz = açık task'ı yok ve son aktivitesi seçilen günden eski. Alt raporlar: İlgili aşaması ve VIP Datalar.
// Not: Kylas'ın "son aktivite" tarihi otomasyon güncellemeleriyle de değişir, sessizlik süresi gerçekte daha uzun olabilir.
// Rol kuralı diğer sekmelerle aynı: admin/director/owner herkesi, manager kendi şubesini, staff kendini görür.
import { useState, useEffect, useRef } from "react";
import { KAYNAKLAR, KYLAS_LEAD_URL, apiCagir, tarih, kucuk, NotBalonu, kisileriYukle, c } from "./CrmRaporu";

const ASAMA_ADLARI = { 222366: "Na1", 253357: "Na2", 253358: "Na3", 218701: "Görüşme", 218702: "İlgili" };
const ILGILI = 218702;
// VIP Datalar: Referans, Bilgi İstek Formu, Ofis, Instagram DM, Eski Öğrenci
const VIP_KAYNAKLAR = [2614512, 2650986, 2614514, 2614515, 3005340];
const SESSIZ_SECENEKLER = [7, 14, 30];
const ALT_RAPORLAR = [
  { k: "tumu", ad: "Tüm takipsizler", suz: () => true },
  { k: "ilgili", ad: "İlgili", suz: l => l.asama === ILGILI },
  { k: "vip", ad: "VIP Datalar", suz: l => VIP_KAYNAKLAR.includes(l.kaynak) },
];

const kaynakAdi = id => KAYNAKLAR.find(k => k.id === id)?.ad || "Diğer";
const gunOnce = v => (v ? Math.floor((Date.now() - new Date(v).getTime()) / 86400000) : null);

export default function TakipRaporu({ user, isAdmin, isManager }) {
  const [kisiler, setKisiler] = useState(null);
  const [kisiHata, setKisiHata] = useState(null);
  const [sube, setSube] = useState("Tümü");
  const [danisman, setDanisman] = useState(null); // kylas id (string)
  const [sessizGun, setSessizGun] = useState(14);
  const [rapor, setRapor] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState(null);
  const [alt, setAlt] = useState("tumu");
  const notOnbellek = useRef({});

  useEffect(() => {
    kisileriYukle().then(setKisiler).catch(() => setKisiHata("Danışman listesi okunamadı."));
  }, []);

  // Rolüne göre seçilebilir danışmanlar
  // Personel sekmesinde olmayan ID kayıtları (test hesapları vb.) seçicide gösterilmez
  const tumu = kisiler ? Object.entries(kisiler).map(([id, k]) => ({ id, ...k })).filter(k => k.personelde) : [];
  const secilebilir = tumu
    .filter(k => {
      if (isAdmin) return sube === "Tümü" || kucuk(k.sube) === kucuk(sube);
      if (isManager) return kucuk(k.sube) === kucuk(user?.branch);
      return k.email === kucuk(user?.email) || kucuk(k.ad) === kucuk(user?.name);
    })
    .sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  const subeler = ["Tümü", ...[...new Set(tumu.map(k => k.sube).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr"))];

  // Staff tek kişidir, doğrudan kendi raporu açılır
  useEffect(() => {
    if (!isAdmin && !isManager && !danisman && secilebilir.length === 1) setDanisman(secilebilir[0].id);
  }, [kisiler]);

  useEffect(() => {
    if (!danisman) return;
    let iptal = false;
    setYukleniyor(true);
    setHata(null);
    apiCagir({ islem: "takip", ownerId: Number(danisman), sessizGun })
      .then(d => { if (!iptal) setRapor(d); })
      .catch(e => { if (!iptal) { setRapor(null); setHata(e.message); } })
      .finally(() => { if (!iptal) setYukleniyor(false); });
    return () => { iptal = true; };
  }, [danisman, sessizGun]);

  const secili = danisman && kisiler?.[danisman];
  const altRapor = ALT_RAPORLAR.find(a => a.k === alt);
  const liste = rapor ? rapor.takipsiz.filter(altRapor.suz) : [];
  const o = rapor?.ozet;
  const takipOrani = o && o.toplam ? Math.round((o.ileriTask / o.toplam) * 100) : 0;

  return (
    <>
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
            <div style={c.etiket}>Danışman</div>
            <div style={c.chipSatir}>
              {!kisiler && !kisiHata && <span style={{ fontSize: "13px", color: "#94a3b8" }}>Yükleniyor...</span>}
              {secilebilir.map(k => <button key={k.id} onClick={() => setDanisman(k.id)} style={danisman === k.id ? c.chipAktif : c.chip}>{k.ad}</button>)}
            </div>
          </div>
        )}
        <div>
          <div style={c.etiket}>Sessizlik süresi</div>
          <div style={c.chipSatir}>
            {SESSIZ_SECENEKLER.map(g => <button key={g} onClick={() => setSessizGun(g)} style={sessizGun === g ? c.chipAktif : c.chip}>{g} günden eski</button>)}
          </div>
        </div>
      </div>

      {kisiHata && <div style={c.hata}>{kisiHata}</div>}
      {kisiler && !danisman && <div style={c.bos}>Raporu görmek için bir danışman seçin.</div>}
      {danisman && yukleniyor && <div style={c.bos}><span style={c.spinner} /> Kylas'tan lead'ler alınıyor...</div>}
      {danisman && !yukleniyor && hata && <div style={c.hata}>{hata}</div>}

      {danisman && !yukleniyor && !hata && rapor && (
        <>
          <div style={t.kartlar}>
            <Kart sayi={o.toplam} etiket="Açık lead (Na1-İlgili)" />
            <Kart sayi={o.ileriTask} etiket="İleri tarihli task" renk="#166534" zemin="#f0fdf4" cerceve="#86efac" />
            <Kart sayi={o.gecikmisTask} etiket="Gecikmiş task" renk="#92400e" zemin="#fffbeb" cerceve="#fde68a" />
            <Kart sayi={o.takipsiz} etiket={`Takipsiz (${sessizGun}+ gün)`} renk="#991b1b" zemin="#fef2f2" cerceve="#fca5a5" />
            <Kart sayi={`%${takipOrani}`} etiket="Takip oranı" alt="ileri task'lı / açık lead" />
          </div>

          <div style={c.tablo}>
            <div style={c.tabloBaslik}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>{secili?.ad} · Takipsiz lead'ler</span>
              <div style={c.chipSatir}>
                {ALT_RAPORLAR.map(a => (
                  <button key={a.k} onClick={() => setAlt(a.k)} style={alt === a.k ? c.chipAktif : c.chip}>
                    {a.ad} ({rapor.takipsiz.filter(a.suz).length})
                  </button>
                ))}
              </div>
            </div>
            {liste.length === 0 ? (
              <div style={c.bos}>Bu raporda lead yok.</div>
            ) : (
              <div style={{ overflowX: "auto", maxHeight: "620px", overflowY: "auto" }}>
                <table style={c.grid}>
                  <thead>
                    <tr>
                      {["Lead ID", "Ad Soyad", "Aşama", "Kaynak"].map(b => <th key={b} style={{ ...c.th, textAlign: "left", position: "sticky", top: 0 }}>{b}</th>)}
                      <th style={{ ...c.th, position: "sticky", top: 0 }}>Oluşturma</th>
                      <th style={{ ...c.th, position: "sticky", top: 0 }}>Son aktivite</th>
                      <th style={{ ...c.th, textAlign: "center", position: "sticky", top: 0 }}>Notlar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liste.map((l, i) => {
                      const g = gunOnce(l.sonAktivite);
                      return (
                        <tr key={l.id} style={{ background: i % 2 ? "#fbfdff" : "#fff" }}>
                          <td style={{ ...c.td, textAlign: "left" }}>
                            <a href={KYLAS_LEAD_URL(l.id)} target="_blank" rel="noopener noreferrer" style={c.link}>{l.id}</a>
                          </td>
                          <td style={{ ...c.td, textAlign: "left", color: "#0f172a", fontWeight: 600, whiteSpace: "nowrap" }}>{l.ad || <span style={{ color: "#cbd5e1" }}>İsimsiz</span>}</td>
                          <td style={{ ...c.td, textAlign: "left", whiteSpace: "nowrap", fontWeight: l.asama === ILGILI ? 700 : 400, color: l.asama === ILGILI ? "#0e7490" : undefined }}>{ASAMA_ADLARI[l.asama] || ""}</td>
                          <td style={{ ...c.td, textAlign: "left", whiteSpace: "nowrap" }}>
                            {kaynakAdi(l.kaynak)}
                            {VIP_KAYNAKLAR.includes(l.kaynak) && <span style={t.vip}>VIP</span>}
                          </td>
                          <td style={c.td}>{tarih(l.olusturma)}</td>
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

function Kart({ sayi, etiket, alt, renk = "#0f172a", zemin = "#fff", cerceve = "#e2e8f0" }) {
  return (
    <div style={{ ...t.kart, background: zemin, borderColor: cerceve }}>
      <div style={{ ...t.kartSayi, color: renk }}>{typeof sayi === "number" ? sayi.toLocaleString("tr-TR") : sayi}</div>
      <div style={t.kartEtiket}>{etiket}</div>
      {alt && <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>{alt}</div>}
    </div>
  );
}

const t = {
  kartlar: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "20px", animation: "fadeUp 0.4s ease-out" },
  kart: { border: "1.5px solid", borderRadius: "16px", padding: "18px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  kartSayi: { fontSize: "26px", fontWeight: 700, marginBottom: "4px", fontVariantNumeric: "tabular-nums" },
  kartEtiket: { fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" },
  vip: { marginLeft: "6px", padding: "1px 6px", borderRadius: "6px", background: "#fef3c7", color: "#92400e", fontSize: "10px", fontWeight: 700 },
  dipnot: { fontSize: "11px", color: "#94a3b8", marginTop: "10px", textAlign: "right" },
};
