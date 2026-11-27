// v1.1: tekli mod (Danışman Özeti): bir kişi seçilir, seçince menü kapanır; hızlı seçimler ve şube kutuları gizli
// v1.0: danışman için açılır çoklu seçim (Aktivite Tablosu). Görünüşü veri kaynağı seçicisiyle (KaynakSecici.jsx) aynı.
// Danışmanlar şubelere göre gruplu; şube başlığındaki kutu o şubedeki herkesi seçer ya da bırakır.
// Üstte hızlı seçimler: Tümünü seç, Temizle. Dışarı tıklayınca ya da Esc ile kapanır.
// Seçim her tıklamada anında üst bileşene gider (onChange), istekleri üst bileşen biriktirir.
import { useState, useEffect, useRef } from "react";

const subeAdi = k => k.sube || "Şubesiz";

export function danismanOzeti(danismanlar, secili, bosMetin, tekli = false) {
  if (!secili.length) return bosMetin;
  if (tekli) return danismanlar.find(k => k.id === secili[0])?.ad || bosMetin;
  if (danismanlar.length && danismanlar.every(k => secili.includes(k.id))) return `Tüm danışmanlar (${secili.length})`;
  // Seçim tam olarak bir ya da birkaç şubenin tamamıysa şube adlarıyla yaz
  const subeler = [...new Set(danismanlar.map(subeAdi))];
  const tamSubeler = subeler.filter(sb => danismanlar.filter(k => subeAdi(k) === sb).every(k => secili.includes(k.id)));
  const tamKisiler = danismanlar.filter(k => tamSubeler.includes(subeAdi(k))).map(k => k.id);
  if (tamSubeler.length && tamKisiler.length === secili.length) return `${tamSubeler.join(", ")} (${secili.length})`;
  const adlar = danismanlar.filter(k => secili.includes(k.id)).map(k => k.ad);
  return adlar.length > 2 ? `${adlar.slice(0, 2).join(", ")} +${adlar.length - 2}` : adlar.join(", ");
}

export default function DanismanSecici({ danismanlar, secili, onChange, bosMetin = "Danışman seçin", yukleniyor = false, tekli = false }) {
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

  const subeler = [...new Set(danismanlar.map(subeAdi))];
  const degistir = id => {
    if (tekli) { onChange([id]); setAcik(false); return; }
    onChange(secili.includes(id) ? secili.filter(x => x !== id) : [...secili, id]);
  };
  function subeDegistir(sb) {
    const idler = danismanlar.filter(k => subeAdi(k) === sb).map(k => k.id);
    const hepsi = idler.every(id => secili.includes(id));
    onChange(hepsi ? secili.filter(id => !idler.includes(id)) : [...new Set([...secili, ...idler])]);
  }

  return (
    <div ref={kutu} style={{ position: "relative", display: "inline-block", minWidth: "260px" }}>
      <button type="button" onClick={() => setAcik(a => !a)} aria-expanded={acik} disabled={yukleniyor}
        className="tema-tetik" style={{ ...k.tetik, borderColor: acik ? "var(--marka)" : secili.length ? "#67c6dc" : "#e2e8f0" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: secili.length ? "#0f172a" : "#94a3b8" }}>
          {yukleniyor ? "Yükleniyor..." : danismanOzeti(danismanlar, secili, bosMetin, tekli)}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          {secili.length > 0 && !tekli && <span className="tema-rozet" style={k.rozet}>{secili.length}</span>}
          <span style={{ fontSize: "10px", color: "#64748b", transform: acik ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▼</span>
        </span>
      </button>

      {acik && (
        <div style={k.panel} role="listbox" aria-multiselectable="true">
          {!tekli && <div style={k.hizli}>
            <button type="button" onClick={() => onChange(danismanlar.map(x => x.id))} style={k.hizliBtn}>Tümünü seç</button>
            <button type="button" onClick={() => onChange([])} disabled={!secili.length}
              style={{ ...k.hizliBtn, color: "#dc2626", opacity: secili.length ? 1 : 0.4, cursor: secili.length ? "pointer" : "default" }}>Temizle</button>
          </div>}
          <div style={{ maxHeight: "360px", overflowY: "auto" }}>
            {subeler.map(sb => {
              const uyeler = danismanlar.filter(x => subeAdi(x) === sb);
              const secilen = uyeler.filter(x => secili.includes(x.id)).length;
              return (
                <div key={sb} style={{ marginBottom: "6px" }}>
                  {subeler.length > 1 && tekli && <div style={{ ...k.grup, cursor: "default" }}>{sb}</div>}
                  {subeler.length > 1 && !tekli && (
                    <label style={k.grup}>
                      <input type="checkbox" checked={secilen === uyeler.length} ref={el => { if (el) el.indeterminate = secilen > 0 && secilen < uyeler.length; }}
                        onChange={() => subeDegistir(sb)} style={{ accentColor: "#6366f1", margin: 0 }} />
                      <span>{sb}</span>
                      <span style={{ marginLeft: "auto", fontWeight: 600, color: "#94a3b8" }}>{secilen}/{uyeler.length}</span>
                    </label>
                  )}
                  <div style={k.liste}>
                    {uyeler.map(x => {
                      const var_ = secili.includes(x.id);
                      return (
                        <label key={x.id} style={{ ...k.secenek, background: var_ ? "var(--marka-acik)" : "transparent" }}>
                          <input type={tekli ? "radio" : "checkbox"} checked={var_} onChange={() => degistir(x.id)} style={{ accentColor: "var(--marka)", margin: 0 }} />
                          <span style={{ fontWeight: var_ ? 700 : 500 }}>{x.ad}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {!tekli && (
            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "8px", borderTop: "1px solid #f1f5f9" }}>
              <button type="button" onClick={() => setAcik(false)} style={k.tamam}>Tamam</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const k = {
  tetik: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "9px 14px",
    background: "#fff", border: "1.5px solid", borderRadius: "12px", fontSize: "13px", fontWeight: 600, cursor: "pointer",
    fontFamily: "'Sora', sans-serif", textAlign: "left" },
  rozet: { minWidth: "20px", height: "20px", padding: "0 6px", borderRadius: "999px", background: "var(--marka)", color: "#fff",
    fontSize: "11px", fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" },
  panel: { position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50, width: "min(440px, 90vw)", background: "#fff",
    border: "1.5px solid #e2e8f0", borderRadius: "14px", boxShadow: "0 12px 32px rgba(15,23,42,0.14)", padding: "12px" },
  hizli: { display: "flex", gap: "6px", flexWrap: "wrap", paddingBottom: "10px", marginBottom: "8px", borderBottom: "1px solid #f1f5f9" },
  hizliBtn: { padding: "5px 12px", borderRadius: "999px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569",
    fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'Sora', sans-serif" },
  grup: { display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", fontSize: "11px", fontWeight: 700, color: "#6366f1",
    textTransform: "uppercase", letterSpacing: "0.5px", cursor: "pointer", userSelect: "none", borderBottom: "1px solid #f1f5f9" },
  liste: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 8px", padding: "4px 0" },
  secenek: { display: "flex", alignItems: "center", gap: "8px", padding: "7px 8px", borderRadius: "8px", fontSize: "13px",
    color: "#0f172a", cursor: "pointer", userSelect: "none" },
  tamam: { padding: "6px 16px", borderRadius: "999px", border: "none", background: "var(--marka)", color: "#fff", fontSize: "12px",
    fontWeight: 700, cursor: "pointer", fontFamily: "'Sora', sans-serif" },
};
