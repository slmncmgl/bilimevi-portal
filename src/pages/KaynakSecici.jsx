// v1.0: veri kaynağı için açılır çoklu seçim (CRM Raporu ve Aktivite Tablosu ortak kullanır)
// Düğmede seçimin özeti görünür; tıklanınca kaynaklar onay kutularıyla iki sütunda açılır.
// Üstte hızlı seçimler: Tümünü seç, ★ VIP Datalar, Temizle. Dışarı tıklayınca ya da Esc ile kapanır.
// Seçim her tıklamada anında üst bileşene gider (onChange), istekleri üst bileşen biriktirir.
import { useState, useEffect, useRef } from "react";

// VIP Datalar: Referans, Bilgi İstek Formu, Ofis, Instagram DM, Eski Öğrenci
export const VIP_KAYNAKLAR = [2614512, 2650986, 2614514, 2614515, 3005340];

export function kaynakOzeti(kaynaklar, secili, bosMetin) {
  if (!secili.length) return bosMetin;
  if (secili.length === kaynaklar.length) return "Tüm kaynaklar";
  if (secili.length === VIP_KAYNAKLAR.length && VIP_KAYNAKLAR.every(id => secili.includes(id))) return "★ VIP Datalar";
  const adlar = kaynaklar.filter(k => secili.includes(k.id)).map(k => k.ad);
  return adlar.length > 2 ? `${adlar.slice(0, 2).join(", ")} +${adlar.length - 2}` : adlar.join(", ");
}

export default function KaynakSecici({ kaynaklar, secili, onChange, bosMetin = "Kaynak seçin" }) {
  const [acik, setAcik] = useState(false);
  const kutu = useRef(null);

  useEffect(() => {
    if (!acik) return;
    const disari = e => { if (kutu.current && !kutu.current.contains(e.target)) setAcik(false); };
    const esc = e => { if (e.key === "Escape") setAcik(false); };
    document.addEventListener("mousedown", disari);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", disari); document.removeEventListener("keydown", esc); };
  }, [acik]);

  const degistir = id => onChange(secili.includes(id) ? secili.filter(x => x !== id) : [...secili, id]);
  const vipSecili = secili.length === VIP_KAYNAKLAR.length && VIP_KAYNAKLAR.every(id => secili.includes(id));

  return (
    <div ref={kutu} style={{ position: "relative", display: "inline-block", minWidth: "260px" }}>
      <button type="button" onClick={() => setAcik(a => !a)} aria-expanded={acik}
        style={{ ...k.tetik, borderColor: acik ? "#0891b2" : secili.length ? "#67c6dc" : "#e2e8f0" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: secili.length ? "#0f172a" : "#94a3b8" }}>
          {kaynakOzeti(kaynaklar, secili, bosMetin)}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          {secili.length > 0 && <span style={k.rozet}>{secili.length}</span>}
          <span style={{ fontSize: "10px", color: "#64748b", transform: acik ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▼</span>
        </span>
      </button>

      {acik && (
        <div style={k.panel} role="listbox" aria-multiselectable="true">
          <div style={k.hizli}>
            <button type="button" onClick={() => onChange(kaynaklar.map(x => x.id))} style={k.hizliBtn}>Tümünü seç</button>
            <button type="button" onClick={() => onChange(VIP_KAYNAKLAR)} style={{ ...k.hizliBtn, ...(vipSecili ? k.vipAktif : k.vip) }}>★ VIP Datalar</button>
            <button type="button" onClick={() => onChange([])} disabled={!secili.length}
              style={{ ...k.hizliBtn, color: "#dc2626", opacity: secili.length ? 1 : 0.4, cursor: secili.length ? "pointer" : "default" }}>Temizle</button>
          </div>
          <div style={k.liste}>
            {kaynaklar.map(x => {
              const var_ = secili.includes(x.id);
              return (
                <label key={x.id} style={{ ...k.secenek, background: var_ ? "#ecfeff" : "transparent" }}>
                  <input type="checkbox" checked={var_} onChange={() => degistir(x.id)} style={{ accentColor: "#0891b2", margin: 0 }} />
                  <span style={{ fontWeight: var_ ? 700 : 500 }}>{x.ad}</span>
                  {VIP_KAYNAKLAR.includes(x.id) && <span style={k.vipEtiket}>VIP</span>}
                </label>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "8px", borderTop: "1px solid #f1f5f9" }}>
            <button type="button" onClick={() => setAcik(false)} style={k.tamam}>Tamam</button>
          </div>
        </div>
      )}
    </div>
  );
}

const k = {
  tetik: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "9px 14px",
    background: "#fff", border: "1.5px solid", borderRadius: "12px", fontSize: "13px", fontWeight: 600, cursor: "pointer",
    fontFamily: "'Sora', sans-serif", textAlign: "left" },
  rozet: { minWidth: "20px", height: "20px", padding: "0 6px", borderRadius: "999px", background: "#0891b2", color: "#fff",
    fontSize: "11px", fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" },
  panel: { position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50, width: "min(440px, 90vw)", background: "#fff",
    border: "1.5px solid #e2e8f0", borderRadius: "14px", boxShadow: "0 12px 32px rgba(15,23,42,0.14)", padding: "12px" },
  hizli: { display: "flex", gap: "6px", flexWrap: "wrap", paddingBottom: "10px", marginBottom: "8px", borderBottom: "1px solid #f1f5f9" },
  hizliBtn: { padding: "5px 12px", borderRadius: "999px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569",
    fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'Sora', sans-serif" },
  vip: { borderColor: "#fcd34d", background: "#fffbeb", color: "#92400e" },
  vipAktif: { borderColor: "#d97706", background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff" },
  liste: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 8px", paddingBottom: "8px" },
  secenek: { display: "flex", alignItems: "center", gap: "8px", padding: "7px 8px", borderRadius: "8px", fontSize: "13px",
    color: "#0f172a", cursor: "pointer", userSelect: "none" },
  vipEtiket: { marginLeft: "auto", padding: "1px 6px", borderRadius: "6px", background: "#fef3c7", color: "#92400e", fontSize: "10px", fontWeight: 700 },
  tamam: { padding: "6px 16px", borderRadius: "999px", border: "none", background: "#0891b2", color: "#fff", fontSize: "12px",
    fontWeight: 700, cursor: "pointer", fontFamily: "'Sora', sans-serif" },
};
