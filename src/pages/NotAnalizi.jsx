// v1.0: Not Analizi (test) — Takip Tablosu'nda admin 1-3-5'e basınca açılır. Ekrandaki listedeki dataların
// notlarını "notlar" işlemiyle okur (Kylas'a yazmaz), src/lib/notAnalizi.js ile bayraklar. CSV / JSON indirilebilir.
import { useState, useRef, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { apiCagir } from "./CrmRaporu";
import { leadAnaliz, danismanOzeti, csvYap, ornekVaka, ESIK } from "../lib/notAnalizi";

const UST_SINIR = 300;
const PARALEL = 2;
const RISK_RENK = { Yüksek: ["#b91c1c", "#fef2f2"], Orta: ["#b45309", "#fffbeb"], Düşük: ["#047857", "#ecfdf5"] };
const BAYRAK_AD = {
  KOVALAMA: "Kovalama", TERCIH_SAATI_DINLENMEDI: "Tercih saati", TEK_SAAT_DILIMI: "Tek dilim", RED_SINYALI_SONRASI_DEVAM: "Red sonrası",
  SAGLIKSIZ_ILISKI: "Sağlıksız", KOPYALA_YAPISTIR_TAKIP: "Kopyala-yapıştır", DUZENSIZ_TAKIP: "Düzensiz",
};

function indir(ad, icerik, tip) {
  const url = URL.createObjectURL(new Blob([icerik], { type: tip }));
  const a = document.createElement("a"); a.href = url; a.download = ad; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function NotAnalizi({ liste, kisiAdi, onKapat }) {
  const hedef = liste.slice(0, UST_SINIR);
  const [durum, setDurum] = useState(null); // null | "calisiyor" | "bitti" | "durdu"
  const [ilerleme, setIlerleme] = useState(0);
  const [hatali, setHatali] = useState(0);
  const [sonuclar, setSonuclar] = useState([]);
  const [sadeceBayrakli, setSadeceBayrakli] = useState(true);
  const [bayrakSec, setBayrakSec] = useState("");
  const dur = useRef(false);
  const ornek = useMemo(() => ornekVaka(), []);

  useEffect(() => {
    const tus = e => { if (e.key === "Escape") onKapat(); };
    document.addEventListener("keydown", tus);
    return () => { document.removeEventListener("keydown", tus); dur.current = true; };
  }, []);

  async function baslat() {
    dur.current = false;
    setDurum("calisiyor"); setIlerleme(0); setHatali(0); setSonuclar([]);
    const kuyruk = [...hedef];
    const toplanan = [];
    const isci = async () => {
      while (kuyruk.length && !dur.current) {
        const l = kuyruk.shift();
        try {
          const d = await apiCagir({ islem: "notlar", leadId: l.id, ownerId: l.ownerId, boyut: 100 });
          toplanan.push(leadAnaliz(l.id, kisiAdi(l.ownerId), d.notlar || []));
          setSonuclar([...toplanan]);
        } catch { setHatali(h => h + 1); }
        setIlerleme(p => p + 1);
      }
    };
    await Promise.all(Array.from({ length: PARALEL }, isci));
    setDurum(dur.current ? "durdu" : "bitti");
  }

  const sirali = useMemo(() => {
    const puan = { Yüksek: 3, Orta: 2, Düşük: 1 };
    return [...sonuclar]
      .filter(s => (!sadeceBayrakli || s.bayraklar.length) && (!bayrakSec || s.bayraklar.includes(bayrakSec)))
      .sort((a, b) => puan[b.risk_skoru] - puan[a.risk_skoru] || b.bayraklar.length - a.bayraklar.length || b.toplam_temas - a.toplam_temas);
  }, [sonuclar, sadeceBayrakli, bayrakSec]);
  const ozet = useMemo(() => danismanOzeti(sonuclar), [sonuclar]);
  const bayrakSay = useMemo(() => {
    const m = {}; sonuclar.forEach(s => s.bayraklar.forEach(b => { m[b] = (m[b] || 0) + 1; })); return m;
  }, [sonuclar]);
  const riskSay = useMemo(() => {
    const m = { Yüksek: 0, Orta: 0, Düşük: 0 }; sonuclar.forEach(s => { m[s.risk_skoru]++; }); return m;
  }, [sonuclar]);
  const dosyaAdi = `not-analizi-${new Date().toISOString().slice(0, 10)}`;
  const temizJson = () => JSON.stringify({ esikler: ESIK, leadler: sonuclar.map(({ turler, kapanis, ...s }) => s), danismanlar: ozet }, null, 2);

  return createPortal(
    <div onClick={() => durum !== "calisiyor" && onKapat()} style={{ position: "fixed", inset: 0, zIndex: 9600, background: "rgba(15,23,42,0.35)", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "24px 16px", overflowY: "auto", fontFamily: "'Sora', sans-serif" }}>
      <div role="dialog" aria-modal="true" aria-label="Not Analizi" onClick={e => e.stopPropagation()}
        style={{ width: "min(1100px, 100%)", background: "#fff", borderRadius: "20px", padding: "22px 24px", boxShadow: "0 24px 60px rgba(15,23,42,0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>Not Analizi</div>
          <span style={{ fontSize: "11px", fontWeight: 800, padding: "3px 8px", borderRadius: "999px", background: "#fef3c7", color: "#92400e", letterSpacing: "0.4px" }}>TEST</span>
          <span title={ornek.gecti ? "Örnek vaka beklenen 5 bayrağı ve Yüksek riski verdi" : `Eksik: ${ornek.eksik.join(", ")}`}
            style={{ fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "999px", background: ornek.gecti ? "#ecfdf5" : "#fef2f2", color: ornek.gecti ? "#047857" : "#b91c1c" }}>
            Örnek vaka: {ornek.gecti ? "geçti ✓" : "kaldı ✕"}
          </span>
          <button type="button" onClick={onKapat} disabled={durum === "calisiyor"} aria-label="Kapat" style={{ marginLeft: "auto", border: "none", background: "transparent", fontSize: "22px", color: "#64748b", cursor: "pointer" }}>×</button>
        </div>
        <div style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 16px" }}>
          Ekrandaki listedeki {liste.length} datanın notları okunur{liste.length > UST_SINIR ? ` (ilk ${UST_SINIR})` : ""}; Kylas'a hiçbir şey yazılmaz. Arama saati olarak notun yazıldığı saat (İstanbul) kullanılır. Data başına en fazla son 100 not.
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
          {durum === "calisiyor" ? (
            <button type="button" onClick={() => { dur.current = true; }} style={st.dugme("#fef2f2", "#b91c1c")}>Durdur</button>
          ) : (
            <button type="button" onClick={baslat} disabled={!hedef.length} style={st.dugme("#0891b2", "#fff")}>{durum ? "Yeniden analiz et" : `Analizi başlat (${hedef.length} data)`}</button>
          )}
          {durum && (
            <div style={{ flex: 1, minWidth: "200px", display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ flex: 1, height: "8px", borderRadius: "999px", background: "#eef2f6", overflow: "hidden" }}>
                <div style={{ width: `${hedef.length ? (ilerleme / hedef.length) * 100 : 0}%`, height: "100%", background: "#0891b2", transition: "width .2s" }} />
              </div>
              <span style={{ fontSize: "12px", color: "#475569", whiteSpace: "nowrap" }}>{ilerleme}/{hedef.length}{hatali ? ` · ${hatali} okunamadı` : ""}{durum === "durdu" ? " · durduruldu" : ""}</span>
            </div>
          )}
          {!!sonuclar.length && durum !== "calisiyor" && (
            <>
              <button type="button" onClick={() => indir(`${dosyaAdi}.csv`, csvYap(sonuclar), "text/csv;charset=utf-8")} style={st.dugme("#f1f5f9", "#0f172a")}>CSV indir</button>
              <button type="button" onClick={() => indir(`${dosyaAdi}.json`, temizJson(), "application/json")} style={st.dugme("#f1f5f9", "#0f172a")}>JSON indir</button>
            </>
          )}
        </div>

        {!!sonuclar.length && (
          <>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
              {Object.entries(riskSay).map(([r, n]) => (
                <span key={r} style={{ ...st.rozet, background: RISK_RENK[r][1], color: RISK_RENK[r][0] }}>{r}: {n}</span>
              ))}
              <span style={{ width: "1px", background: "#e2e8f0", margin: "0 4px" }} />
              {Object.entries(BAYRAK_AD).map(([b, ad]) => (
                <button key={b} type="button" onClick={() => setBayrakSec(x => (x === b ? "" : b))}
                  style={{ ...st.rozet, cursor: "pointer", border: `1.5px solid ${bayrakSec === b ? "#0891b2" : "#e2e8f0"}`, background: bayrakSec === b ? "#ecfeff" : "#fff", color: "#0f172a" }}>
                  {ad}: {bayrakSay[b] || 0}
                </button>
              ))}
            </div>

            <div style={st.baslik}>Danışman özeti</div>
            <div style={{ overflowX: "auto", marginBottom: "18px" }}>
              <table style={st.tablo}>
                <thead><tr>{["Danışman", "Analiz edilen", "Bayraklı", "Yüksek risk", "En sık bayrak", "Baskın arama saati"].map(h => <th key={h} style={st.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {ozet.map(o => (
                    <tr key={o.danisman}>
                      <td style={{ ...st.td, fontWeight: 700 }}>{o.danisman}</td>
                      <td style={st.td}>{o.lead}</td>
                      <td style={st.td}>{o.bayrakli} <span style={{ color: "#94a3b8" }}>(%{Math.round((o.bayrakli / o.lead) * 100)})</span></td>
                      <td style={st.td}>{o.yuksek}</td>
                      <td style={st.td}>{BAYRAK_AD[o.en_sik_bayrak] || "-"}</td>
                      <td style={st.td}>{o.baskin_saat || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <div style={{ ...st.baslik, margin: 0 }}>Datalar ({sirali.length})</div>
              <label style={{ fontSize: "12px", color: "#475569", display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                <input type="checkbox" checked={sadeceBayrakli} onChange={e => setSadeceBayrakli(e.target.checked)} /> Sadece bayraklılar
              </label>
            </div>
            <div style={{ overflowX: "auto", maxHeight: "60vh", overflowY: "auto", border: "1px solid #eef2f6", borderRadius: "12px" }}>
              <table style={st.tablo}>
                <thead><tr>{["Lead ID", "Danışman", "Temas", "Görüşme", "Son görüşme", "Ardışık başarısız", "Tercih saati", "Aralık dışı", "Baskın dilim", "Bayraklar", "Risk", "Gerekçe", "Önerilen aksiyon"].map(h => <th key={h} style={{ ...st.th, position: "sticky", top: 0 }}>{h}</th>)}</tr></thead>
                <tbody>
                  {sirali.map(s => (
                    <tr key={s.lead_id}>
                      <td style={st.td}>{s.lead_id}</td>
                      <td style={{ ...st.td, whiteSpace: "nowrap" }}>{s.sahip}</td>
                      <td style={st.td}>{s.toplam_temas}</td>
                      <td style={st.td}>{s.gorusme_sayisi}</td>
                      <td style={{ ...st.td, whiteSpace: "nowrap" }}>{s.son_gorusme_tarihi || "-"}</td>
                      <td style={st.td}>{s.ardisik_basarisiz}</td>
                      <td style={{ ...st.td, whiteSpace: "nowrap" }}>{s.tercih_saati || "-"}</td>
                      <td style={st.td}>{s.aralik_disi_arama_orani === "" ? "-" : `%${Math.round(s.aralik_disi_arama_orani * 100)}`}</td>
                      <td style={{ ...st.td, whiteSpace: "nowrap" }}>{s.baskin_saat_dilimi || "-"}</td>
                      <td style={st.td}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {s.bayraklar.map(b => <span key={b} style={{ ...st.rozet, fontSize: "10px", padding: "2px 6px", background: "#f1f5f9", color: "#334155" }}>{BAYRAK_AD[b]}</span>)}
                        </div>
                      </td>
                      <td style={st.td}><span style={{ ...st.rozet, background: RISK_RENK[s.risk_skoru][1], color: RISK_RENK[s.risk_skoru][0] }}>{s.risk_skoru}</span></td>
                      <td style={{ ...st.td, minWidth: "220px", color: "#334155" }}>{s.kisa_gerekce || "-"}</td>
                      <td style={{ ...st.td, minWidth: "160px", fontWeight: 600 }}>{s.onerilen_aksiyon || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

const st = {
  dugme: (bg, renk) => ({ padding: "9px 16px", borderRadius: "12px", border: "none", background: bg, color: renk, fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }),
  rozet: { display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, border: "none", fontFamily: "inherit", whiteSpace: "nowrap" },
  baslik: { fontSize: "11px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" },
  tablo: { width: "100%", borderCollapse: "collapse", fontSize: "12px" },
  th: { textAlign: "left", padding: "8px 10px", background: "#f8fafc", color: "#64748b", fontWeight: 700, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" },
  td: { padding: "8px 10px", borderBottom: "1px solid #f1f5f9", color: "#0f172a", verticalAlign: "top" },
};
