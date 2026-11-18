// v1.1: kendi sekmesi "Danışman Özeti" (önce Aktivite Tablosu içinde kutuydu). Danışman seçilmeden Kylas'a istek gitmez,
//       açılışta seçim boş gelir. Seçilebilir danışmanlar rol kuralıyla: admin satış ekibi, manager kendi şubesi, staff kendisi.
// v1.0: Aktivite Tablosu > "Son N gün özeti" (tek danışman)
// Seçili danışmanın son N günde (1-90, açılışta 7) yazdığı not, not girdiği data, açtığı ve tamamladığı task sayısı;
// aynı dönemde aldığı yeni datalar: şu an hangi aşamada, kaçına not girilmiş, kaçında task var, kaçına hiç dokunulmamış.
// Sayılar crm-rapor "ozet" işleminden gelir.
// Aşama değişiklikleri Kylas'ta geçmiş olarak tutulmadığı için henüz sayılmıyor.
import { useState, useEffect } from "react";
import { apiCagir, c, KYLAS_LEAD_URL, tarih, KAYNAKLAR, kisileriYukle, kucuk } from "./CrmRaporu";
import TarihSecici from "./TarihSecici";
import Ipucu from "./Ipucu";

const ASAMALAR = [
  [217285, "Yeni"], [222366, "Na1"], [253357, "Na2"], [253358, "Na3"], [218701, "Görüşme"], [218702, "İlgili"],
  [217286, "Yeni Kayıt"], [217287, "İlgisiz"], [217288, "Olumsuz"],
];
const ASAMA_ADI = Object.fromEntries(ASAMALAR);
const kaynakAdi = id => KAYNAKLAR.find(k => k.id === id)?.ad || "Diğer";
const SAYFA = 20;
export const OZET_SURUM = "v1.1"; // 1. satırdaki sürümle aynı tut (sayfanın altındaki etikette görünür)

const ACIKLAMA = {
  baslik: "Seçili danışmanın son N gündeki işleri ve bu dönemde aldığı yeni datalar. Tüm veri kaynakları sayılır.",
  not: "Danışmanın bu dönemde Kylas'ta yazdığı not sayısı.",
  notluData: "Danışmanın bu dönemde en az bir not yazdığı farklı data sayısı.",
  taskAcilan: "Danışmanın bu dönemde oluşturduğu task sayısı.",
  taskTamam: "Danışmana atanmış olup bu dönemde tamamlanan task sayısı.",
  aktivite: "Aşama değişiklikleri ve aramalar Kylas'tan geçmiş olarak alınamadığı için şimdilik sayılmıyor.",
  yeni: "Bu dönemde oluşturulup danışmana atanmış Bilimevi datası. Aşamalar datanın bugünkü aşamasıdır.",
  notlu: "Yeni datalardan danışmanın not yazdıkları.",
  taskli: "Yeni datalardan task'ı olanlar (açık ya da tamamlanmış).",
  dokunulmamis: "Hâlâ Yeni aşamasında, notu ve task'ı olmayan yeni datalar.",
};

export default function DanismanOzeti({ user, isAdmin, isManager }) {
  const [kisiler, setKisiler] = useState(null);
  const [kisiHata, setKisiHata] = useState(null);
  const [kisiId, setKisiId] = useState(null); // açılışta boş: danışman seçilmeden istek gitmez
  const [gun, setGun] = useState(7);
  const [veri, setVeri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState(null);
  const [filtre, setFiltre] = useState(null); // null: liste kapalı | "hepsi" | "notlu" | "taskli" | "dokunulmamis" | aşama id
  const [gosterilen, setGosterilen] = useState(SAYFA);

  useEffect(() => {
    kisileriYukle().then(setKisiler).catch(() => setKisiHata("Danışman listesi okunamadı."));
  }, []);

  // Rolüne göre seçilebilir danışmanlar (Aktivite Tablosu ile aynı kural)
  const tumu = kisiler ? Object.entries(kisiler).map(([id, k]) => ({ id, ...k })).filter(k => k.personelde) : [];
  const secilebilir = (isAdmin || isManager ? tumu.filter(k => k.satis) : tumu)
    .filter(k => {
      if (isAdmin) return true;
      if (isManager) return kucuk(k.sube) === kucuk(user?.branch);
      return k.email === kucuk(user?.email) || kucuk(k.ad) === kucuk(user?.name);
    })
    .sort((a, b) => (a.sube || "").localeCompare(b.sube || "", "tr") || a.ad.localeCompare(b.ad, "tr"));
  const subeler = [...new Set(secilebilir.map(k => k.sube || "Şubesiz"))];

  useEffect(() => {
    setFiltre(null);
    if (!kisiId) { setVeri(null); return; }
    let iptal = false;
    setYukleniyor(true);
    setHata(null);
    const zamanlayici = setTimeout(() => {
      apiCagir({ islem: "ozet", ownerId: Number(kisiId), gun })
        .then(d => { if (!iptal) setVeri(d); })
        .catch(e => { if (!iptal) { setVeri(null); setHata(e.message); } })
        .finally(() => { if (!iptal) setYukleniyor(false); });
    }, 400);
    return () => { iptal = true; clearTimeout(zamanlayici); };
  }, [kisiId, gun]);

  useEffect(() => { setGosterilen(SAYFA); }, [filtre]);

  const y = veri?.yeni;
  const a = veri?.aktivite;
  const listeSuz = l => filtre === "hepsi" || (filtre === "notlu" && l.not > 0) || (filtre === "taskli" && l.task)
    || (filtre === "dokunulmamis" && l.asama === 217285 && !l.not && !l.task) || l.asama === filtre;
  const liste = y && filtre !== null ? y.liste.filter(listeSuz) : [];
  const filtreSec = f => setFiltre(s => (s === f ? null : f));
  const filtreAdi = filtre === "hepsi" ? "Tüm yeni datalar" : filtre === "notlu" ? "Notu olanlar" : filtre === "taskli" ? "Task'ı olanlar"
    : filtre === "dokunulmamis" ? "Dokunulmamış" : ASAMA_ADI[filtre];

  return (
    <div style={{ ...c.tablo, marginBottom: "20px" }}>
      <div style={c.tabloBaslik}>
        <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", display: "inline-flex", alignItems: "center", gap: "10px" }}>
          <Ipucu metin={ACIKLAMA.baslik}>Danışman Özeti · Son {gun} gün</Ipucu>
          {yukleniyor && veri && <span style={{ ...c.spinner, width: "14px", height: "14px" }} />}
        </span>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <select value={kisiId || ""} onChange={e => setKisiId(e.target.value || null)} style={{ ...o.secim, ...(kisiId ? {} : o.secimBos) }} aria-label="Danışman">
            <option value="">{kisiler ? "Danışman seçin" : "Yükleniyor..."}</option>
            {subeler.length > 1
              ? subeler.map(sb => (
                <optgroup key={sb} label={sb}>
                  {secilebilir.filter(k => (k.sube || "Şubesiz") === sb).map(k => <option key={k.id} value={k.id}>{k.ad}</option>)}
                </optgroup>
              ))
              : secilebilir.map(k => <option key={k.id} value={k.id}>{k.ad}</option>)}
          </select>
          <TarihSecici deger={gun} onChange={setGun} tumu={false} enFazla={90} />
        </div>
      </div>

      {kisiHata && <div style={{ ...c.hata, margin: "16px 24px" }}>{kisiHata}</div>}
      {!kisiId && !kisiHata && <div style={{ ...c.bos, padding: "40px 0" }}>Özeti görmek için yukarıdan bir danışman seçin.</div>}
      {kisiId && yukleniyor && !veri && <div style={{ ...c.bos, padding: "28px 0" }}><span style={c.spinner} /> Kylas'tan alınıyor...</div>}
      {kisiId && !yukleniyor && hata && <div style={{ ...c.hata, margin: "16px 24px" }}>{hata}</div>}

      {kisiId && !hata && veri && (
        <div style={{ padding: "18px 24px 20px", opacity: yukleniyor ? 0.45 : 1, pointerEvents: yukleniyor ? "none" : "auto", transition: "opacity 0.2s" }}>
          <div style={o.ikili}>
            <div>
              <div style={c.etiket}><Ipucu metin={ACIKLAMA.aktivite}>Aktivite</Ipucu></div>
              <div style={o.kartlar}>
                <Kucuk sayi={a.not} etiket="Yazdığı not" ipucu={ACIKLAMA.not} />
                <Kucuk sayi={a.notluData} etiket="Not girdiği data" ipucu={ACIKLAMA.notluData} />
                <Kucuk sayi={a.taskAcilan} etiket="Açtığı task" ipucu={ACIKLAMA.taskAcilan} />
                <Kucuk sayi={a.taskTamamlanan} etiket="Tamamladığı task" ipucu={ACIKLAMA.taskTamam} />
              </div>
            </div>
            <div>
              <div style={c.etiket}><Ipucu metin={ACIKLAMA.yeni}>Yeni gelen data</Ipucu></div>
              <div style={o.kartlar}>
                <Kucuk sayi={y.toplam} etiket="Yeni data" ipucu={ACIKLAMA.yeni} secili={filtre === "hepsi"} onClick={y.toplam ? () => filtreSec("hepsi") : null} />
                <Kucuk sayi={y.notlu} etiket="Notu var" ipucu={ACIKLAMA.notlu} secili={filtre === "notlu"} onClick={y.notlu ? () => filtreSec("notlu") : null} />
                <Kucuk sayi={y.taskli} etiket="Task'ı var" ipucu={ACIKLAMA.taskli} secili={filtre === "taskli"} onClick={y.taskli ? () => filtreSec("taskli") : null} />
                <Kucuk sayi={y.dokunulmamis} etiket="Dokunulmamış" ipucu={ACIKLAMA.dokunulmamis} renk={y.dokunulmamis ? "#991b1b" : undefined}
                  zemin={y.dokunulmamis ? "#fef2f2" : undefined} cerceve={y.dokunulmamis ? "#fca5a5" : undefined}
                  secili={filtre === "dokunulmamis"} onClick={y.dokunulmamis ? () => filtreSec("dokunulmamis") : null} />
              </div>
            </div>
          </div>

          {y.toplam > 0 && (
            <div style={{ marginTop: "16px" }}>
              <div style={c.etiket}>Yeni datalar bugün hangi aşamada</div>
              <div style={o.bar}>
                {ASAMALAR.filter(([id]) => y.asamalar[id]).map(([id, ad], i) => (
                  <div key={id} title={`${ad}: ${y.asamalar[id]}`} style={{ flex: y.asamalar[id], background: RENK[i % RENK.length] }} />
                ))}
              </div>
              <div style={{ ...c.chipSatir, marginTop: "10px" }}>
                {ASAMALAR.filter(([id]) => y.asamalar[id]).map(([id, ad], i) => (
                  <button key={id} onClick={() => filtreSec(id)} style={filtre === id ? c.chipAktif : c.chip}>
                    <span style={{ ...o.nokta, background: RENK[i % RENK.length] }} />{ad} ({y.asamalar[id]})
                  </button>
                ))}
              </div>
            </div>
          )}

          {filtre !== null && (
            <div style={{ marginTop: "16px", border: "1px solid #eef2f6", borderRadius: "14px", overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                <span>{filtreAdi} ({liste.length})</span>
                <button onClick={() => setFiltre(null)} style={c.chip}>✕ Kapat</button>
              </div>
              {y.kesildi && <div style={{ padding: "8px 14px", fontSize: "12px", color: "#92400e" }}>Listede en yeni 300 data var.</div>}
              <div style={{ overflowX: "auto" }}>
                <table style={c.grid}>
                  <thead>
                    <tr>
                      {["Data ID", "Ad Soyad", "Aşama", "Kaynak"].map(b => <th key={b} style={{ ...c.th, textAlign: "left" }}>{b}</th>)}
                      <th style={c.th}>Data tarihi</th>
                      <th style={{ ...c.th, textAlign: "center" }}>Not</th>
                      <th style={{ ...c.th, textAlign: "center" }}>Task</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liste.slice(0, gosterilen).map((l, i) => (
                      <tr key={l.id} style={{ background: i % 2 ? "#fbfdff" : "#fff" }}>
                        <td style={{ ...c.td, textAlign: "left" }}><a href={KYLAS_LEAD_URL(l.id)} target="_blank" rel="noreferrer" style={c.link}>{l.id}</a></td>
                        <td style={{ ...c.td, textAlign: "left", whiteSpace: "nowrap" }}>{l.ad || "-"}</td>
                        <td style={{ ...c.td, textAlign: "left", whiteSpace: "nowrap" }}>{ASAMA_ADI[l.asama] || "-"}{l.yeniBekliyor ? <span style={o.uyari}>1 günden fazla</span> : null}</td>
                        <td style={{ ...c.td, textAlign: "left", whiteSpace: "nowrap" }}>{kaynakAdi(l.kaynak)}</td>
                        <td style={c.td}>{tarih(l.olusturma)}</td>
                        <td style={{ ...c.td, textAlign: "center" }}>{l.not || <span style={{ color: "#cbd5e1" }}>·</span>}</td>
                        <td style={{ ...c.td, textAlign: "center", color: "#166534" }}>{l.task ? "✓" : <span style={{ color: "#cbd5e1" }}>·</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {liste.length > gosterilen && (
                <div style={{ padding: "10px", textAlign: "center" }}>
                  <button onClick={() => setGosterilen(g => g + SAYFA)} style={c.chip}>Daha fazla göster ({liste.length - gosterilen})</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Kucuk({ sayi, etiket, ipucu, renk = "#0f172a", zemin = "#fff", cerceve = "#e2e8f0", onClick, secili }) {
  return (
    <Ipucu metin={ipucu} blok isaret={false}>
      <div onClick={onClick || undefined} role={onClick ? "button" : undefined}
        style={{ ...o.kart, background: zemin, borderColor: secili ? "#0891b2" : cerceve, cursor: onClick ? "pointer" : "help",
          boxShadow: secili ? "0 0 0 3px #cffafe" : "none" }}>
        <div style={{ fontSize: "24px", fontWeight: 800, color: renk, fontVariantNumeric: "tabular-nums" }}>{(sayi ?? 0).toLocaleString("tr-TR")}</div>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", marginTop: "2px" }}>{etiket}</div>
      </div>
    </Ipucu>
  );
}

const RENK = ["#0891b2", "#6366f1", "#8b5cf6", "#a855f7", "#f59e0b", "#16a34a", "#059669", "#94a3b8", "#ef4444"];
const o = {
  secim: { height: "34px", padding: "0 12px", borderRadius: "999px", border: "1.5px solid #0891b2", background: "#ecfeff", color: "#0f172a",
    fontSize: "12px", fontWeight: 700, fontFamily: "'Sora', sans-serif", cursor: "pointer" },
  secimBos: { borderColor: "#e2e8f0", background: "#fff", color: "#64748b" },
  ikili: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" },
  kartlar: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "10px" },
  kart: { border: "1.5px solid", borderRadius: "14px", padding: "12px 10px", textAlign: "center", height: "100%", boxSizing: "border-box", transition: "all 0.15s" },
  bar: { display: "flex", height: "10px", borderRadius: "999px", overflow: "hidden", gap: "2px", background: "#f1f5f9" },
  nokta: { display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", marginRight: "6px", verticalAlign: "middle" },
  uyari: { marginLeft: "6px", fontSize: "10px", fontWeight: 700, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "999px", padding: "1px 6px" },
};
